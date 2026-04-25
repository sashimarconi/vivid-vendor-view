---
name: Utmify Integration
description: Integração automática com Utmify API para rastreamento de vendas e UTMs, isolada por user_id
type: feature
---
- Tabela `utmify_settings` com api_token, platform_name, active (unique por user_id)
- Edge function `send-utmify-order` envia pedidos para API Utmify (POST https://api.utmify.com.br/api-credentials/orders)
- Disparo automático: PIX gerado → status waiting_payment, PIX pago → status paid
- Chamado de dentro de `create-pix-payment` e `payment-webhook`
- Dados isolados: cada usuário configura sua própria credencial API da Utmify
- Platform name configurável (aparece no campo "platform" dos pedidos na Utmify)
- UI em /dashboard/pixels dentro da aba "Integrações" (antigo "Pixels")
- Captura de parâmetros UTM (src, sck, utm_source, utm_campaign, utm_medium, utm_content, utm_term) da URL do checkout
- UTMs armazenados na coluna `utm_params` (jsonb) da tabela `orders`
- UTMs enviados automaticamente no campo `trackingParameters` do payload da Utmify
