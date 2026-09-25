---
name: estoque-no-salvamento-do-fechamento
description: Só o painel desconta Estoque ao gravar Leitura, e o DELETE do mesmo dia não devolve — salvar duas vezes desconta duas vezes; o api-core (PWAs) não toca Estoque nem MovimentacaoEstoque
metadata:
  type: project
---

"Ressalvamento" não existe como palavra no código — é o termo do Design Doc
(`docs/design/fechamento-diario-api.md:250`) para o **salvamento** do fechamento.
Estado real, confirmado por grep em 20/09/2026:

- **Painel toca `Estoque`**: `frontend/apps/web/src/services/api/leitura.service.ts:340-392`
  — depois do `INSERT` das `Leitura`, agrupa litros por combustível e faz
  `Estoque.quantidade_atual -= totalLitros`. Falha de estoque só vira
  `console.warn`, não derruba o salvamento (`:389-392`).
- **O DELETE não devolve**: `leitura.service.ts:413-430` (`deleteByDate`) só apaga
  a `Leitura`. Como `useSubmissaoFechamento.ts:103` chama `deleteByDate` e depois
  `bulkCreate` (`:156`), **regravar o mesmo dia desconta o estoque de novo**.
- **`MovimentacaoEstoque` não participa**: os dois únicos escritores estão em
  `frontend/apps/web/src/services/stockService.ts:104` e `:160`, consumidos só por
  `components/estoque/gestao/hooks/useGestaoEstoque.ts:106` (tela de Estoque).
- **`@posto/api-core` não toca estoque nenhum** — `rg "Estoque" frontend/packages/api-core/src/`
  devolve zero. Logo, PWA do frentista e PWA do dono nunca mexem em `Estoque`.

**Why:** o Design Doc listou "Estoque no ressalvamento" como decisão pendente do
dono; na verdade há um comportamento em produção e ele tem um bug de duplo
desconto.
**How to apply:** portar isso para Laravel "igual" cristaliza o bug. As três
saídas já estão escritas no próprio Design Doc (`:250`, itens P10/P11).

Reconfirmar:
```bash
rg -n "Estoque" frontend/apps/web/src/services/api/leitura.service.ts
rg -n "Estoque|Movimentacao" frontend/packages/api-core/src/
rg -rn "from\('MovimentacaoEstoque'\)" frontend/apps
```
