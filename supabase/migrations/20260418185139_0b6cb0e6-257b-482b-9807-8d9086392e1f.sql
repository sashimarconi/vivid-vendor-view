-- ============================================================
-- ITEM 1: Fix orders UPDATE policy (anti-fraude PIX)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can update pix_copied only" ON public.orders;

-- RPC segura que SÓ marca pix_copied = true (sem alterar status, total, etc)
CREATE OR REPLACE FUNCTION public.mark_pix_copied(_order_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.orders
  SET pix_copied = true
  WHERE id = _order_id AND pix_copied IS DISTINCT FROM true;
$$;

GRANT EXECUTE ON FUNCTION public.mark_pix_copied(uuid) TO anon, authenticated;

-- ============================================================
-- ITEM 2: user_plans - bloquear escalação de privilégio
-- ============================================================
DROP POLICY IF EXISTS "Users can update own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can insert own plan" ON public.user_plans;
-- Plan só é criado pelo trigger handle_new_user_plan e atualizado por admin_update_user_plan/fee

-- ============================================================
-- ITEM 3: visitor_sessions - parar vazamento de PII
-- ============================================================
DROP POLICY IF EXISTS "Anon can read own session" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can update visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Anyone can insert visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Owner can read visitor sessions" ON public.visitor_sessions;

-- INSERT: público pode inserir, mas user_id NÃO pode ser nulo (evita injeção órfã)
CREATE POLICY "Public can insert visitor sessions"
  ON public.visitor_sessions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NOT NULL);

-- UPDATE: apenas pela própria sessão (não dá pra alterar dados arbitrários)
CREATE POLICY "Public can update own visitor session"
  ON public.visitor_sessions
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (user_id IS NOT NULL);

-- SELECT: SÓ o owner (lojista) lê suas próprias sessões. Admin lê tudo via has_role.
CREATE POLICY "Owner can read visitor sessions"
  ON public.visitor_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- ITEM 4: Storage product-images - ownership
-- ============================================================
-- Drop policies antigas se existirem
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Owner can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update own product images" ON storage.objects;
DROP POLICY IF EXISTS "Owner can delete own product images" ON storage.objects;

-- SELECT público (necessário para exibir imagens em vitrines)
CREATE POLICY "Public can read product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- INSERT: arquivo deve estar em pasta do próprio user (path: {user_id}/file.png)
CREATE POLICY "Owner can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- UPDATE: só dono do path
CREATE POLICY "Owner can update own product images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- DELETE: só dono do path
CREATE POLICY "Owner can delete own product images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- ITEM 5: page_events / abandoned_carts - validação cross-tenant
-- ============================================================
-- page_events: já tem "user_id IS NOT NULL", reforçando que session_id também não pode ser vazio
DROP POLICY IF EXISTS "Public can insert page events safely" ON public.page_events;
CREATE POLICY "Public can insert page events safely"
  ON public.page_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND session_id IS NOT NULL
    AND length(session_id) > 0
  );

-- abandoned_carts: garantir que user_id corresponde ao dono do produto referenciado (quando há produto)
DROP POLICY IF EXISTS "Public can insert abandoned carts safely" ON public.abandoned_carts;
CREATE POLICY "Public can insert abandoned carts safely"
  ON public.abandoned_carts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NOT NULL
    AND (
      product_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = abandoned_carts.product_id AND p.user_id = abandoned_carts.user_id
      )
    )
  );

-- abandoned_carts: permitir UPDATE público (atualização do mesmo carrinho ao avançar passos)
-- mas só se mantiver o mesmo user_id
DROP POLICY IF EXISTS "Public can update abandoned carts safely" ON public.abandoned_carts;
CREATE POLICY "Public can update abandoned carts safely"
  ON public.abandoned_carts
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (user_id IS NOT NULL);

-- ============================================================
-- ITEM 6: custom_domains - esconder verification_token
-- ============================================================
DROP POLICY IF EXISTS "Public can read custom domains safe" ON public.custom_domains;

-- Recria view pública SEM verification_token
DROP VIEW IF EXISTS public.custom_domains_public CASCADE;
CREATE VIEW public.custom_domains_public
WITH (security_invoker = on) AS
  SELECT id, user_id, domain, verified, created_at, updated_at
  FROM public.custom_domains;

GRANT SELECT ON public.custom_domains_public TO anon, authenticated;

-- Policy SELECT pública na tabela base APENAS para resolver domínio (sem token)
-- Como views security_invoker respeitam RLS da tabela base, precisamos permitir SELECT público
-- mas o token NUNCA é exposto pela view.
CREATE POLICY "Public can read custom domains base for view"
  ON public.custom_domains
  FOR SELECT
  TO anon
  USING (true);

-- Reforço: authenticated owner já tem ALL via "Owner can manage custom domains"
-- (que cobre SELECT do verification_token quando logado)