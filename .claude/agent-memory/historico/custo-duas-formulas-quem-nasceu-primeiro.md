---
name: custo-duas-formulas-quem-nasceu-primeiro
description: A média ponderada de custo é a fórmula ORIGINAL (0ef4587, 21/12/2025); a média do mês entrou depois em 97fee45 (26/07/2026) sem tocar na escrita — a divergência nunca foi decidida, foi deixada
metadata:
  type: project
---

**Ordem cronológica, contra a intuição de "entrou uma segunda fórmula".**

A **média ponderada com estoque anterior** é a **primeira**, não a segunda:

- `0ef4587` (21/12/2025, *"feat: integrate frentista mobile app and various web
  improvements"*) — nasce em `services/api.ts` (monolito) e no
  `services/stockService.ts` criado no mesmo commit. Sem justificativa no corpo:
  a mensagem é genérica e não menciona custo.
- `4a908c1` (09/01/2026, *"refactor(api): modularizacao do api.ts em services
  especificos (Issue #8)"*) — a modularização **copia** a fórmula para
  `apps/web/src/services/api/compra.service.ts` (+87 linhas). Corpo vazio.
- Desde `f609781` (18/01/2026) `compra.service.ts` e `stockService.ts`
  **não foram tocados** — a fórmula de escrita está congelada há 7 meses.

A **média do próprio mês** (a da planilha, `F16 = E16/D16`) é a **segunda**:

- `97fee45` (26/07/2026, *"feat(utils): módulo canônico de lucro + golden master
  vs planilha real"*) cria `packages/utils/src/lucro.ts`. O corpo justifica o
  modelo contra a planilha real e **não menciona a escrita**.
- `2a97224` (26/07/2026) leva isso ao `aggregator.service.ts`, matando o
  `0,45/L hardcoded` — de novo, só leitura.
- `0296430` (19/08/2026) adiciona `custoMedioCompra` e mata a margem % fixa no
  `useCalculoGestaoBicos`.

**Conclusão que importa para o saneamento: a divergência nunca foi uma decisão.**
Nenhum commit dos dois lados cita o outro. A leitura foi consolidada em
`packages/utils` em julho/agosto e a escrita simplesmente ficou onde estava.

**Estado em 28/08/2026 — 3 cópias eram, 2 são:**
- `apps/web/src/services/api/compra.service.ts:117` (`Estoque.custo_medio`) — VIVA
- `apps/web/src/services/stockService.ts:88` (`preco_custo`) — VIVA
- `usePersistenciaRegistro.ts` — **removida** em `b36fc39` (26/08/2026, PR #58,
  merge `0039bcc`), *"média ponderada em Combustivel.preco_custo retirada"*.

**A divergência está travada por golden**, mas por replicação, não por chamada:
`478fbb5` (26/08/2026, *"test(utils): golden do encadeamento de estoque entre
meses e da divergência das fórmulas de custo"*) →
`packages/utils/src/estoque-encadeamento.golden.spec.ts`. Ele **replica** a
ponderada porque `packages/*` não importa de `apps/*` (§2). Mexer no custo dentro
de `apps/web` **não** dispara esse golden.

**How to apply:** ao sanear custo/lucro, tratar `compra.service.ts` e
`stockService.ts` como o lado que ninguém tocou desde janeiro — não há autor a
consultar nem razão registrada a preservar. E não confiar no golden do
encadeamento como rede: ele mede o tamanho do erro, não guarda a chamada.

Ver [[aggregator-nasceu-como-legacy-service]] e
[[refatoracoes-do-fechamento-que-nao-entraram]].
