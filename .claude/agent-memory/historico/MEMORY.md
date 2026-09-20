# Memória — agente `historico`

- [Parse do encerrante: a divergência de 871b904](parse-do-encerrante-divergencia-871b904.md) — linha certa e errada nasceram no mesmo commit (11/01/2026); `bc3dd63` só corrigiu a exibição
- [Bug que só aparece no dado grande](bug-que-so-aparece-no-dado-grande.md) — só o Bico 01 passa de 1 milhão, por isso o parse errado sobreviveu 7 meses invisível
- [Custo: qual das duas fórmulas nasceu primeiro](custo-duas-formulas-quem-nasceu-primeiro.md) — a ponderada é a original (0ef4587, 21/12/2025); a divergência nunca foi decidida, foi deixada
- [O aggregator nasceu como legacy.service.ts](aggregator-nasceu-como-legacy-service.md) — sobra do api.ts em 4a908c1 (09/01/2026), rebatizada "Facade" no dia seguinte; nunca houve tentativa de quebrá-lo
- [Refatorações do fechamento que não entraram](refatoracoes-do-fechamento-que-nao-entraram.md) — revert 0f201ef, o loop de 3 min de 12/08, e os PRs #6/#33/#29 cujos commits o rewrite de 29/07 levou
- [Pontos de retorno versao-testada-*](nao-existe-ponto-de-retorno-versao-testada.md) — `custo-lucro`→834e2d7 (26/08, leve, local) e `pre-raiz`→6662b24 (anotada 17/09); nenhum cobre a fase-a pós-#119 (conferido 19/09/2026)
- [regras.md não acompanhou as travas](regras-md-nao-acompanhou-as-travas.md) — 35377c8/e29a0b8 (18/09) instalaram sem atualizar o registro; FSD só cobre apps/web
- [Hooks de 19/09: colisões e origem](hooks-regras-quebradas-colisoes.md) — testa-pre-push.sh:40 usa hooksPath=/dev/null legítimo; memória manda symlinkar node_modules
- [Tetos de tamanho já existiam](tetos-de-tamanho-ja-existiam.md) — max-lines 900 (04fe282) e PHPMD Method/ClassLength (cc51ffb) desde 17/09; pacote de 19/09 aperta, não cria
- [A #60 já decidiu sair do Supabase](issue-60-ja-decidiu-sair-do-supabase.md) — #60 (28/08) nunca foi ao CHANGELOG; #93 (07/09) diz "um Supabase por cliente"; as duas abertas (conferido 17/09/2026)
