---
name: taxa-cartao-deduzida-duas-vezes
description: A taxa de cartão é despesa do mês (dono confirmou 26/08), mas 3 sites do fechamento diário a deduzem por transação — o modelo do painel contradiz o de frontend/packages/utils
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
