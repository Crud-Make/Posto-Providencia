---
name: mapa-implementacoes-de-custo
description: Onde moram as implementações de custo do produto/operacional (canônica em lucro.ts vs. ponderadas de escrita vs. leitores de custo_medio); comandos para recontar
metadata:
  type: project
---

**[28/08/2026]** Levantamento do raio de impacto para consolidar custo. Três famílias,
não duas — a divisão que importa não é "packages vs. apps", é **qual regra cada uma aplica**.

**A) Canônica — média do próprio mês** (`frontend/packages/utils/src/lucro.ts`):
`custoMedioCompra` = Σ valor ÷ Σ litros das compras DO MÊS, devolve `null` sem compra (nunca 0);
`despesaOperacionalPorLitro` = despesas do mês ÷ litros vendidos do mês.
Reexportada pelo barril `frontend/packages/utils/src/index.ts`.

**B) Ponderada com estoque anterior — só na ESCRITA**, e é a que diverge da planilha:
`compra.service.ts` (grava `Estoque.custo_medio`) e `stockService.ts` (grava
`Produto.preco_custo`, loja/conveniência, tabela diferente). São dois arquivos, não três:
`usePersistenciaRegistro.ts` **já não pondera** — só `valor_total ÷ litros`.

**C) Leitores do carimbo `Estoque.custo_medio`** — herdam o erro de (B) sem recalcular:
`aggregator.service.ts` (2 pontos), `salesAnalysis.service.ts`, `useDashboardVendas.ts`.
`useRelatorioDiario.ts` é pior: usa `Combustivel.preco_custo` do cadastro (preço de hoje
aplicado a dia histórico) — o próprio JSDoc admite "aproximação de tela".

**Recontar as três famílias:**
```
rg -n "custo_medio|preco_custo|custoPorLitro|custoOperacional|custoMedio|custo_combustiveis" \
  apps packages -g '*.ts' -g '*.tsx' -g '!*.golden.spec.*' -g '!*.test.*' -g '!*generated*' | sort
rg -Un "custoMedioCompra|despesaOperacionalPorLitro|lucroCombustivel|margemPercentual" apps packages -g '*.ts' -g '*.tsx'
```

**Colunas de lucro do `Fechamento`: leitura sem escrita.** Confirmado de novo em 28/08 — as
6 colunas (`custo_combustiveis`, `lucro_bruto`, `lucro_liquido`, `taxas_pagamento`, as 2 de
margem) **não têm nenhum escritor no app**. O grep que fecha isso e volta vazio:
```
rg -Un "insert\(|update\(|upsert\(" apps packages -g '*.ts' -g '*.tsx' -g '!*.test.*' -A6 \
  | rg "lucro_bruto|lucro_liquido|custo_combustiveis|taxas_pagamento|margem_.*_percentual"
```
Ver [[colunas-lucro-fechamento-sao-carimbadas]].

**Taxa de cartão — três modelos vivos ao mesmo tempo**, e é isso que produz a subtração dupla:
taxa como despesa do mês (`lucro.ts`, o certo), taxa por transação chumbada no SQL
(`DÉBITO × 1,2%` / `CRÉDITO × 3,5%`, nas RPCs `get_dashboard_proprietario` e
`get_fechamento_mensal`), e taxa carimbada em `Fechamento.taxas_pagamento`. `useFinanceiro.ts`
desconta a 3ª junto com a lista de `Despesa`; a RPC do proprietário desconta a 2ª junto com
`Despesa` — mas `useDashboardProprietario` **descarta o `lucro_liquido` da RPC de propósito**
e refaz a conta, então essa tela escapa. Achar todos os pontos de taxa:
```
rg -n "taxa" apps packages -g '*.ts' -g '*.tsx' -g '!*generated*' -g '!*/database/*'
rg -n "custo_taxas|0\.012|0\.035" supabase/migrations
```

**Aggregator: 3 dos 6 métodos não têm chamador de produção** — `fetchClosingData`,
`fetchAttendantsData`, `fetchInventoryData` só aparecem no barril `services/api/index.ts` e
nos testes. Conferir antes de mexer (o barril mascara: procure o nome, não o arquivo):
```
rg -n "fetchClosingData|fetchAttendantsData|fetchInventoryData" apps -g '*.ts' -g '*.tsx'
```
