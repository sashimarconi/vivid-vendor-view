# Project Memory

## Core
VoidTok: SaaS multi-tenant para e-commerce estilo TikTok Shop. Dark mode, void/galaxy aesthetic.
Rotas: /login, /register, /dashboard/*. Legacy /admin/* redireciona.
Todas as tabelas têm user_id com RLS isolando dados por usuário.
Português BR em toda UI do dashboard.

## Memories
- [SaaS Multi-Tenant](mem://features/saas-multi-tenant) — Arquitetura multi-tenant com user_id, RLS, rotas /dashboard, auth
- [Checkout System](mem://features/checkout-system) — Fluxo PIX com tracking de cópia
- [Admin Theme](mem://style/admin-theme) — Dark mode void/galaxy com cyan e purple neon
- [Product Builder](mem://admin/product-builder) — Editor visual de página de produto
- [Checkout Builder](mem://admin/checkout-builder) — Editor drag-and-drop do checkout
- [Multi-Store](mem://features/multi-store-system) — Vitrines independentes com slugs únicos
- [Tracking Pixels](mem://features/tracking-pixels) — TikTok/Meta pixel integration
- [Utmify Integration](mem://features/utmify-integration) — Rastreamento de vendas via Utmify API, isolado por user_id
- [Sale Notifications](mem://features/sale-notifications) — Notificações realtime de vendas
- [Gateway Settings](mem://admin/gateway-settings) — BlackCatPay, GhostsPay, Duck, Hiso, Paradise
- [Order Management](mem://admin/order-management) — Gestão de pedidos com filtros
- [Abandoned Carts](mem://features/abandoned-carts) — Recuperação de carrinhos abandonados
- [Webhook Management](mem://admin/webhook-management) — Integração com serviços externos
- [PWA Mobile](mem://admin/pwa-mobile-experience) — PWA instalável
- [Admin Reviews](mem://features/admin-reviews) — Avaliações vinculadas a múltiplos produtos
- [Conversion Tools](mem://admin/conversion-tools) — Fretes e order bumps
- [Variant Management](mem://features/variant-management) — Variantes agrupadas por categorias
