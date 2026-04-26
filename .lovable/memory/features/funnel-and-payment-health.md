---
name: Funil + Saúde do Pagamento
description: Funil de conversão com alertas de queda, monitoramento de gateway com fallback automático em ordem de prioridade, e logs de eventos do funil
type: feature
---

# Funil de Conversão + Saúde do Pagamento

## Páginas
- `/dashboard/funnel` (AdminFunnel.tsx) — funil sessões → product_view → buy_click → checkout_view → pix_generated → paid_orders. Compara hoje vs média 7d e mostra alertas quando há queda ≥30% (com pelo menos 5 eventos/dia médios).
- `/dashboard/payment-health` (AdminPaymentHealth.tsx) — KPIs (chamadas, taxa erro, latência avg/p95, PIX órfãos) por gateway + reordenação de prioridade fallback.

## Eventos de funil registrados em `page_events`
- `page_view` (já existia, via usePageTracking)
- `buy_click` — disparado em ProductPage.tsx no handleBuyNow (antes de navegar pro checkout/external)
- `checkout_view` — usePageTracking em CheckoutPage
- `pix_generated` — trackEvent após sucesso do create-pix-payment

## Schema
- `gateway_health_logs`: latency_ms, success, status_code, error_message, fallback_from, order_id
- `gateway_settings.fallback_priority` int — ordena os candidatos a fallback (DESC)

## Funções RPC
- `user_funnel_metrics(_hours int)` — agrega o funil para o user logado
- `user_funnel_alerts()` — compara hoje vs média 7d
- `user_gateway_health(_hours int)` — agrega chamadas/latência/erros por gateway
- `user_orphan_pix(_hours int)` — pedidos sem transaction_id (heurística de falha de gateway)

## Fallback automático em create-pix-payment
A função busca todos os gateways do dono do produto com `secret_key` configurada, ordenados por (active DESC, fallback_priority DESC). Tenta cada um em sequência; se um falhar, loga em `gateway_health_logs` (com `fallback_from`) e tenta o próximo. Se todos falharem, retorna 502 com lista de tried.
