
-- Tabela de domínios personalizados por usuário
CREATE TABLE public.custom_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

-- Índices
CREATE INDEX idx_custom_domains_user_id ON public.custom_domains(user_id);
CREATE INDEX idx_custom_domains_domain ON public.custom_domains(domain);

-- RLS
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- Usuário autenticado gerencia seus próprios domínios
CREATE POLICY "Owner can manage custom domains"
  ON public.custom_domains FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Leitura pública para resolução de domínio
CREATE POLICY "Public can read custom domains"
  ON public.custom_domains FOR SELECT
  TO public
  USING (true);

-- Trigger updated_at
CREATE TRIGGER update_custom_domains_updated_at
  BEFORE UPDATE ON public.custom_domains
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
