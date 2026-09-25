---
name: taxa-de-pagamento-onde-e-calculada
description: Onde vive a conta valor × taxa/100 no fechamento-diario, por que nenhum resultado dela chega à tela ou ao banco, e por que não existe golden possível para ela (docs/data não tem taxa)
metadata:
  type: reference
---

**[20/09/2026]** Medido em `origin/fase-a` (91593a8), não no checkout local (que estava
48 commits atrás).

## Onde a conta existe

Recontar sempre, nunca copiar número:

```bash
git grep -nE "taxa\s*/\s*100|\*\s*[a-zA-Z_.]*taxa" origin/fase-a -- frontend
```

Em 20/09 devolvia só `hooks/usePagamentos.ts` e `hooks/useFechamento.ts` de
`frontend/apps/web/src/components/fechamento-diario/`. Backend Laravel **não** calcula taxa:
`git grep -ni taxa origin/fase-a -- backend/app` só devolve `$casts`, `$fillable` e Resource.

## O achado que muda a conversa: ninguém consome o resultado

- `index.tsx:94` desestrutura `usePagamentos` **sem** `totalTaxas`/`totalLiquido`.
- `index.tsx:149` desestrutura `useFechamento` só com `totalVendas, totalFrentistas,
  diferenca, podeFechar` — sem `totalTaxas`, `valorLiquido` nem `resumo`.
- `Fechamento.taxas_pagamento` não tem escritor no frontend
  (`git grep -n taxas_pagamento origin/fase-a -- frontend | grep -v types/`).

Fora dos próprios testes de unidade, os três cálculos são **valor morto**. Conferir com
`git grep -n "totalTaxas\|totalLiquido\|valorLiquido" origin/fase-a -- frontend`.
Isso já vale para [[colunas-lucro-fechamento-sao-carimbadas]]: nada carimba a taxa.

## Golden de taxa é impossível hoje — não é questão de escrever o teste

`docs/data/janeiro_referencia.sqlite` não tem coluna de taxa em tabela nenhuma
(`jan_frentista` tem pix/credito/debito/moeda/notas/baratao/dinheiro/total; `jan_encerrante`
é encerrante). `docs/data/posto_jorro_2026.sqlite` também não — varrer com
`PRAGMA table_info` procurando `tax` devolve vazio. E `lucro.golden.spec.ts` diz no cabeçalho
que a taxa do mês 01 é `null` na planilha, então o golden de lucro passa sem exercer taxa.

Consequência: a trava dessa fórmula tem de ser `*.regressao.test.ts` (vitest), não
`*.golden.spec.ts`. Vale igual no pre-push — ele roda **os dois** (`bun run test` e
`bun run test:golden`, em worktree do commit que sobe, com `docs/data` linkado). A CI do
GitHub roda só o vitest, de propósito (`.github/workflows/ci.yml`, nota no fim do arquivo:
golden depende de `docs/data`, que é gitignored).

## Modelo de domínio: taxa por transação é rejeitada para lucro

`packages/utils/src/lucro.ts:11-12` — taxa de cartão **não** é dedução por transação, é item
de despesa do mês. A migração `supabase/migrations/20260828_rpc_taxa_cartao_e_despesa_do_mes.sql`
matou a estimativa chumbada (1,2%/3,5%) da RPC `get_dashboard_proprietario` e deixou
`custo_taxas` devolvendo 0 por assinatura. Qualquer helper novo de `valor × taxa` só pode
alimentar exibição operacional; se entrar em lucro/despesa, é dupla contagem.

## Float: o drift não está entre as duas formas

`valor*(taxa/100)` e `(valor*taxa)/100` divergem só no último bit (~1e-17); não chega perto de
um centavo. A diferença observável aparece ao **quantizar por pagamento** com `emCentavos`
em vez de somar em float e quantizar no fim — e isso é decisão de política de arredondamento,
não conserto de bug. Quem propuser "paridade provada" precisa dizer qual das duas semânticas
está adotando.

Relacionado: [[mapa-implementacoes-de-custo]], [[despesa-tela-compras-vs-planilha-mes]].
