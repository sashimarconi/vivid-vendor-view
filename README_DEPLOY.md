# Deploy na Vercel

Guia passo a passo para hospedar o frontend deste projeto na Vercel mantendo o backend (banco, auth, edge functions) no Lovable Cloud.

## 1. Enviar o código para o GitHub

No topo do editor do Lovable, clique em **GitHub → Connect to GitHub** e crie/conecte um repositório. Todas as edições feitas no Lovable serão automaticamente commitadas nesse repo.

## 2. Importar o projeto na Vercel

1. Acesse https://vercel.com/new
2. Clique em **Import** no repositório do GitHub que você acabou de conectar
3. A Vercel vai detectar automaticamente que é um projeto **Vite**

### Configurações de build (já vêm corretas por padrão)

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

## 3. Adicionar variáveis de ambiente

Antes de clicar em Deploy, expanda **Environment Variables** e adicione:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | `https://mngohqhzwuozrzrzrgbs.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uZ29ocWh6d3VvenJ6cnpyZ2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMjY2MjMsImV4cCI6MjA5MDcwMjYyM30._HY1jaYeAdtXkaNj5ADM1mdzN9n7X5bdlWD_VuSacLc` |
| `VITE_SUPABASE_PROJECT_ID` | `mngohqhzwuozrzrzrgbs` |

> Essas chaves são publishable/anon — podem ficar expostas no frontend sem problema.

## 4. Deploy

Clique em **Deploy**. Em ~1 minuto seu app estará no ar em uma URL `*.vercel.app`.

## 5. (Opcional) Conectar domínios customizados

Se quiser usar `seguro.lojatok.shop` ou `www.voidtok.site` na Vercel:

1. No painel da Vercel, vá em **Settings → Domains**
2. Adicione o domínio
3. A Vercel vai mostrar o registro DNS necessário (geralmente um CNAME apontando para `cname.vercel-dns.com`)
4. Atualize o DNS no provedor do domínio
5. **Remova** os domínios da configuração de custom domain do Lovable para evitar conflito

## O que continua no Lovable Cloud

- Banco de dados Postgres
- Autenticação de usuários
- Edge functions (`create-pix-payment`, `payment-webhook`, `send-utmify-order`, etc.)
- Storage de arquivos
- Webhooks dos gateways de pagamento (BlackCat, GhostsPay, etc.) — as URLs deles apontam para edge functions Supabase e **não mudam**

## Workflow de desenvolvimento

1. Edite normalmente aqui no Lovable
2. Cada mudança é commitada automaticamente no GitHub
3. A Vercel detecta o push e faz redeploy automático em ~1 min

## SPA Routing

O arquivo `vercel.json` na raiz já configura o rewrite `/(.*) → /index.html` necessário para que React Router funcione em refresh de página e deep links (ex: `/dashboard/orders`).

## Troubleshooting

**Erro 404 ao dar refresh em uma rota:** verifique se `vercel.json` está na raiz do projeto.

**"Missing Supabase env":** confirme que as 3 variáveis `VITE_*` estão configuradas em **Settings → Environment Variables** na Vercel e refaça o deploy.

**Edge functions retornam erro de CORS:** as edge functions já permitem qualquer origem (`Access-Control-Allow-Origin: *`), então o domínio da Vercel funciona sem ajustes.
