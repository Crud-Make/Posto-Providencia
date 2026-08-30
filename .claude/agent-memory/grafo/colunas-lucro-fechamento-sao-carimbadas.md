---
name: colunas-lucro-fechamento-sao-carimbadas
description: custo_combustiveis/lucro_bruto/lucro_liquido/margens em Fechamento são colunas gravadas por script offline; taxas_pagamento não tem escritor; getLucroPorPeriodo só lê
metadata:
  type: project
---

`fechamentoService.getLucroPorPeriodo` (`apps/web/src/services/api/fechamento.service.ts:222`)
**não é RPC** — faz `.from('Fechamento').select(...)` e reduz em JS. Lê como
**colunas já gravadas**: `total_vendas`, `custo_combustiveis`, `lucro_bruto`,
`taxas_pagamento`, `diferenca`, `lucro_liquido`, margens. `faltas = SUM(abs(diferenca))`.

Quem preenche cada coluna de `Fechamento` (confirmado 21/08/2026 por grep):
- `total_vendas`, `total_recebido`, `diferenca`, `status`: a submissão da UI —
  `apps/web/src/components/fechamento-diario/hooks/useSubmissaoFechamento.ts:223`
  (`fechamentoService.update`). `total_vendas` = venda **cheia do encerrante/concentrador**
  (`totaisLeituras.valor` em `useFechamento.ts:242`), não o conferido.
- `custo_combustiveis`, `lucro_bruto`, `lucro_liquido`, margens: **só** o script offline
  `scripts/auditoria-lucro-mes.py` (emite `UPDATE "Fechamento" ... FROM (VALUES ...)`,
  aplicado à mão com `--sql`). Nada no app/edge/trigger recalcula na leitura.
- `taxas_pagamento`: **nenhum escritor no repo** — sempre null→0. (O único cálculo de taxa
  é o RPC legado `get_fechamento_mensal` em `supabase/migrations/legado/fix_lucro_calculation.sql`,
  que não é usado por este caminho e nem grava a coluna.)

Consequência: fechamento criado pela UI (ex.: replay de janeiro pós-wipe de 14/08) sai com
`custo_combustiveis=taxas_pagamento=lucro_*=0` até rodarem o auditoria script. O card
"Despesas Totais" (`useFinanceiro.ts:254`) então vira `0 + 0 + faltas + despesasOps`.
Não há dupla contagem de `faltas`: receita usada é a cheia (concentrador), falta contada 1x.

Reconfirmar escritores:
```
grep -rn "custo_combustiveis\|taxas_pagamento" apps packages supabase --include=*.ts --include=*.sql | grep -iE "insert|update|upsert|set |from\('Fechamento'\)" | grep -v generated
```
