---
name: dois-bugs-do-salvar-do-painel
description: 20/09 — o Salvar do painel APAGA envio de frentista que chegou depois da tela carregar, e desconta o Estoque duas vezes ao regravar o dia; os dois são do caminho A
metadata:
  type: project
---

**Achados em 20/09/2026** lendo o caminho de gravação real (produção rodando). Os dois são do
**caminho A** (painel, aba Fechamento Diário), não dos PWAs.

## 1. O Salvar do painel apaga envio de frentista

`useSubmissaoFechamento.ts:116` chama `deleteByFechamento(fechamento.id)`, que apaga **todos** os
`FechamentoFrentista` do dia (`fechamentoFrentista.service.ts:246-257`), e depois reinsere
(`:199`) **a partir do estado da tela**. As sessões da tela foram carregadas em
`useSessoesFrentistas.ts:181-228`, que só mescla **no carregamento**.

**Então:** se um frentista enviar pelo PWA *depois* de o painel ter aberto a tela, o Salvar apaga
esse envio e **não o reinsere**. O dinheiro daquele frentista some do fechamento, sem erro e sem
aviso.

Não é hipótese: o mecanismo está provado no código. O que não se sabe é a frequência — isso é
história operacional, não código.

## 2. Estoque desconta duas vezes ao regravar o dia

`leitura.service.ts:340-392` desconta `Estoque.quantidade_atual` depois do INSERT das `Leitura`.
Mas `deleteByDate` (`:413-430`) **não devolve** — só apaga a `Leitura`. E
`useSubmissaoFechamento.ts:103` chama `deleteByDate` antes de `:156` chamar `bulkCreate`.

**Salvar o mesmo dia duas vezes desconta o estoque duas vezes.** Já está descrito em
`docs/design/fechamento-diario-api.md:250`, com três saídas possíveis (devolver no DELETE, não
tocar, ou mover para o módulo Estoque) e **nenhuma escolhida**.

Os PWAs nunca tocam `Estoque` — `rg "Estoque|Movimentacao" frontend/packages/api-core/src/`
devolve zero. É assimetria entre os dois caminhos, não decisão.

## Por que os dois somem com a API

Quando a escrita for `PUT /api/postos/{posto}/fechamentos/{data}`, **existe um escritor só**. O
bug 1 deixa de ser possível por construção, não por cuidado. É o melhor argumento a favor da
migração que apareceu até agora.

Ver [[dois-escritores-de-total-vendas]] (caminho A × B divergem) e
[[total-vendas-vale-o-encerrante]].
