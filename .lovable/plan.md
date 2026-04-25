
## Plano: Deploy do projeto na Vercel

### O que vai ser feito

Preparar o projeto para hospedagem na Vercel mantendo o backend (banco, auth, edge functions) no Lovable Cloud.

### Mudanças no código

1. **Criar `vercel.json` na raiz** com rewrite para SPA routing (sem isso, refresh em `/dashboard`, `/admin/orders`, etc. dá 404):
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

2. **Criar `README_DEPLOY.md`** com passo a passo:
   - Push do projeto pro GitHub (botão GitHub no topo do Lovable)
   - Importar repo na Vercel (vercel.com/new)
   - Framework: Vite (auto-detectado)
   - Build command: `npm run build`
   - Output directory: `dist`
   - Adicionar variáveis de ambiente:
     - `VITE_SUPABASE_URL` = `https://mngohqhzwuozrzrzrgbs.supabase.co`
     - `VITE_SUPABASE_PUBLISHABLE_KEY` = (chave anon já no .env)
     - `VITE_SUPABASE_PROJECT_ID` = `mngohqhzwuozrzrzrgbs`
   - Deploy

### Pontos de atenção

- **Backend continua no Lovable Cloud**: edge functions (`create-pix-payment`, `payment-webhook`, etc.), banco Postgres, auth e storage seguem rodando na infra atual. A Vercel só serve o frontend estático.
- **Domínios customizados**: você já tem `seguro.lojatok.shop` e `www.voidtok.site` apontando pro Lovable. Se mudar pra Vercel, precisa reapontar o DNS desses domínios pra Vercel (CNAME pro endereço da Vercel).
- **Webhooks de gateway**: as URLs de webhook dos gateways de pagamento (BlackCat, GhostsPay, etc.) apontam pra edge functions Supabase — não mudam, continuam funcionando.
- **Resolução de domínio multi-tenant**: o `useDomainResolver` usa `window.location.hostname` no client, então funciona igual na Vercel desde que os domínios customizados sejam configurados lá.
- **Edits via Lovable**: depois do deploy na Vercel, você continua editando aqui no Lovable e dando push pro GitHub — a Vercel faz redeploy automático a cada push.

### Alternativa

Se o objetivo é só ter um domínio profissional sem trocar de host, dá pra continuar no Lovable e usar o sistema nativo de custom domain (que você já usa). Vercel só vale a pena se quiser features específicas dela (analytics próprio, edge middleware, preview branches automáticas, etc.).
