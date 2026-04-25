-- 1) Remove a policy pública que expõe access_token e dados sensíveis dos pixels
DROP POLICY IF EXISTS "Tracking pixels public read" ON public.tracking_pixels;

-- 2) Cria uma view pública que expõe APENAS o necessário para disparo client-side
--    (sem access_token, que é segredo S2S)
CREATE OR REPLACE VIEW public.tracking_pixels_public
WITH (security_invoker = on) AS
  SELECT
    id,
    user_id,
    platform,
    pixel_id,
    active,
    fire_on_paid_only,
    created_at
  FROM public.tracking_pixels
  WHERE active = true;

-- 3) Permite leitura anônima da view (sem o token sensível)
GRANT SELECT ON public.tracking_pixels_public TO anon, authenticated;

-- 4) Garante que policy do owner (ALL) continua intacta para CRUD autenticado.
--    Adiciona policy SELECT explícita para autenticados poderem ler seus próprios pixels via tabela base
--    (a policy "ALL" já cobre, mas deixamos clara a intenção)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tracking_pixels' AND policyname = 'Owner can read own tracking pixels'
  ) THEN
    CREATE POLICY "Owner can read own tracking pixels"
      ON public.tracking_pixels
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;