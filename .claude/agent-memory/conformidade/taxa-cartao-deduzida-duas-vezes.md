---
name: taxa-cartao-deduzida-duas-vezes
description: A taxa de cartão é despesa do mês (dono confirmou 26/08), mas 3 sites do fechamento diário a deduzem por transação — o modelo do painel contradiz o de frontend/packages/utils; em 20/09 os 3 sites são código morto (nenhum consumidor)
metadata:
  type: project
---

**A taxa de cartão NÃO é dedução por transação.** É mais um item da lista de
despesas mensais que alimenta `despesaOperacionalPorLitro`. Está escrito no
cabeçalho de `frontend/packages/utils/src/lucro.ts` e o dono confirmou em **26/08/2026**.

**Mesmo assim, três sites do painel deduzem `valor × taxa/100` do recebido** e
chamam o resto de "valor líquido". Onde o mesmo fechamento também entra no rateio
mensal de despesa, a taxa sai **duas vezes** do lucro.
Reconferir (conferido 28/08/2026 — 3 hits, 2 arquivos):
```bash
grep -rn 'taxa / 100\|p.taxa) / 100\|taxa / 100)' frontend/apps/web/src/components/fechamento-diario/hooks/
grep -n 'A "taxa de cartão"' frontend/packages/utils/src/lucro.ts
```

**20/09/2026 — os 3 sites são CÓDIGO MORTO, e isso reordena o achado.** Nenhuma das
quatro saídas dessa conta chega à tela. `index.tsx:94` desestrutura de `usePagamentos`
só `pagamentos`, `carregando`, `carregarPagamentos` e `sincronizarComSessoes` —
`totalTaxas` e `totalLiquido` ficam no `RetornoPagamentos` sem consumidor.
`index.tsx:149` desestrutura de `useFechamento` só
`{ totalVendas, totalFrentistas, diferenca, podeFechar }` — `totalTaxas`,
`valorLiquido` e o `exibicao` que os formata ficam órfãos. O único consumidor vivo é
`usePagamentos.test.ts:109-110`. A aba "Fechamento Financeiro" que editava isso saiu
em 30/08/2026 (comentário em `index.tsx:91-92`); a conta ficou.

**Consequência para o ranking:** o *deletion test* passa — apagar as 4 saídas não muda
pixel nenhum. Então "dinheiro em float" aqui **não custa dinheiro hoje**, custa o risco
de alguém religar a saída e propagar um modelo que `frontend/packages/utils/src/lucro.ts:11`
declara errado. Promover isso a helper em `frontend/packages/utils` **codifica em canônico
uma convenção que o canônico nega** — é o caminho caro. Reconferir antes de repetir:
```bash
cd frontend
grep -n 'usePagamentos(postoAtivoId)' -B8 apps/web/src/components/fechamento-diario/index.tsx
grep -n 'useFechamento(bicos' apps/web/src/components/fechamento-diario/index.tsx
grep -rn 'totalTaxas\|totalLiquido\|valorLiquido' apps/web/src --include='*.ts' --include='*.tsx'
```

**Por que isto não é um bug para consertar direto:** é uma **divergência de modelo
a decidir com o dono**, igual ao caso do denominador em
[[residuo-na-fronteira-hook-utils]]. "Valor líquido que o frentista entrega" e
"lucro do mês" podem legitimamente querer números diferentes — o que não pode é os
dois usarem o nome "líquido" sem dizer qual convenção seguem. Mexer nisso é
categoria **domínio**, nunca estrutural, e precisa de golden master antes (§0.6).

**How to apply:** ao ranquear, reportar como *divergência de convenção a decidir*,
não como "o painel está errado". E lembrar que a memória automática da sessão
(`.claude/memoria/taxa-cartao-e-despesa-do-mes.md`) já registra que o card
Receitas/Despesas desconta a taxa duas vezes via `taxas_pagamento` — o achado do
fechamento diário é a **terceira** porta do mesmo problema, não uma nova.

Ver [[formula-duplicada-fora-utils]] e [[golden-master-como-conferir]].
