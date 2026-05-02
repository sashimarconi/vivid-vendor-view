Diagnóstico

Sim, tem algo errado na forma como o Radar está medindo “visitantes ao vivo”. Pelos dados atuais do backend, sua loja não está com só ~54 visitantes:

- cerca de 71 sessões nos últimos 20s
- cerca de 94 sessões nos últimos 60s
- cerca de 128 sessões nos últimos 120s
- cerca de 187 sessões nos últimos 5 min

Ou seja: o problema principal é de contagem/exibição, não de falta de tráfego.

Principais causas identificadas

1. O card “Visitantes” usa uma janela muito agressiva: 20 segundos.
   - Hoje o Radar só conta `visitor_sessions.last_seen_at >= now() - 20s`.
   - Isso derruba o número toda vez que o navegador atrasa heartbeat, a aba perde foco, o celular economiza bateria ou a rede oscila.

2. O primeiro registro da sessão demora para entrar.
   - No `usePageTracking`, a gravação em `visitor_sessions` espera a geolocalização terminar.
   - Se o provedor de geo demorar/falhar, o visitante pode ficar vários segundos sem aparecer no Radar.

3. O heartbeat atual é frágil para tráfego real.
   - Ele roda a cada 10s, mas o painel só aceita sessão viva por 20s.
   - Na prática, basta perder 1–2 atualizações para o visitante “sumir” do mapa/KPI mesmo ainda navegando.

Plano de correção

1. Corrigir a captura da sessão na origem
   - Gravar `visitor_sessions` imediatamente ao abrir a página, sem esperar geo.
   - Buscar geo em paralelo e apenas enriquecer o registro depois.
   - Disparar um heartbeat imediato ao montar a página, antes do intervalo periódico.

2. Corrigir a regra do “ao vivo” no Radar
   - Trocar a janela principal de 20s por uma janela mais estável (60s ou 120s).
   - Usar uma contagem híbrida para evitar subcontagem:
     - sessões com heartbeat recente em `visitor_sessions`
     - apoio por `page_events` recentes quando o heartbeat atrasar
   - Manter deduplicação por `session_id`.

3. Ajustar a leitura visual do painel
   - Fazer o card “Visitantes” refletir visitantes realmente ativos, sem oscilar artificialmente.
   - Se fizer sentido, separar:
     - “Ativos agora”
     - “Últimos 5 min”
   Isso evita a sensação de número “travado” ou “baixo demais”.

4. Validar nas páginas do funil inteiro
   - Verificar Store, Product, Checkout e vitrine por domínio.
   - Garantir que todas continuam enviando presença corretamente com o mesmo padrão.

5. Revisar efeitos colaterais no Radar
   - Conferir globo, lista de páginas visitadas e sessões por localização para garantir que todos usem a mesma definição de sessão viva.
   - Evitar outra divergência entre KPI e blocos auxiliares.

Detalhes técnicos

Arquivos que devem ser ajustados:
- `src/hooks/usePageTracking.ts`
- `src/pages/admin/AdminLiveView.tsx`
- possivelmente páginas públicas que já usam `useVisitorHeartbeat` para padronizar o fluxo de presença

Mudanças previstas:
- inserção imediata em `visitor_sessions`
- geo assíncrona sem bloquear presença
- heartbeat inicial + intervalo mais robusto
- nova janela/fórmula de contagem no Radar

Resultado esperado

- o número de visitantes ao vivo vai subir para algo mais próximo do tráfego real
- menos quedas bruscas e menos “sumiu do nada”
- mapa e KPI vão ficar coerentes com o volume real do funil

Se você aprovar, eu implemento essa correção agora.