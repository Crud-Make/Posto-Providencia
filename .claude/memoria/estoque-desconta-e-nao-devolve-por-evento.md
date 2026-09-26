---
name: estoque-desconta-e-nao-devolve-por-evento
description: 20/09 — dono decidiu a §7 (b): Estoque desconta no INSERT e NÃO devolve (mantém o duplo desconto ao regravar); e a forma é por EVENTO, para Fechamento não depender de Estoque
metadata:
  type: project
---

**Duas decisões do dono em 20/09/2026**, fechando o item (b) do §7 de
`docs/design/fechamento-diario-api.md`.

## 1. O comportamento: mantém como está

O INSERT das `Leitura` desconta `Estoque.quantidade_atual` **por combustível**
(`leitura.service.ts:340-392`; falha vira `console.warn` e não aborta o salvamento), e o
`deleteByDate` **não devolve** (`:413-430`).

> **Decidido: mantém.** Desconta no INSERT, não devolve.

**Consequência aceita conscientemente:** regravar o mesmo dia **desconta o estoque de novo**,
pelo total inteiro. Salvar três vezes desconta três vezes. O dono foi avisado disso ao decidir.
Consertar é issue própria, não fatia estrutural.

## 2. A forma: por EVENTO, não por dependência

"Manter" no Command do Laravel esbarrava numa regra do próprio dono: **nenhum módulo depende de
outro** (CA-7, cobrada pelo Pest Arch). Não existe model `Estoque` no backend, e fazer
`Fechamento` escrever nele violaria a regra — que já teve pedido de exceção **recusado** antes
(ver [[regra-de-arquitetura-nao-ganha-excecao]]).

> **Decidido: por evento.** O Command grava as leituras e **emite o fato** (litros por
> combustível, posto, dia). Quem escuta e desconta é o módulo `App\Estoque`.

`Fechamento` não conhece `Estoque`; a CA-7 fica de pé sem exceção.

**A alternativa descartada** era o Command não tocar estoque: fiel hoje, mas o desconto
**pararia** de acontecer na P11, quando a escrita sair do cliente — mudando dinheiro por
omissão, que é o modo de falha que o §7 existe para impedir.

**Implica:** nasce `App\Estoque` com model e listener. E como estoque é por posto, ele nasce
com `PertenceAoPosto` — TEN-1 cobra isso automaticamente.

## O que ainda trava a P10

Só a **(c)** (`DELETE+INSERT` × `UPSERT` em `FechamentoFrentista`) e a **(f)** (forma dos
contratos). A (d) foi decidida e a (e) foi medida em produção.

Ver [[salvar-o-dia-apaga-leitura-base]] e [[dois-bugs-do-salvar-do-painel]].
