---
name: salvar-o-dia-apaga-leitura-base
description: 20/09 — três defeitos novos do handleSave: salvar o dia APAGA a leitura-base de bico sem fechamento, parseValue é analisarValor (comentário mente), e o passo 5 grava 0 onde devia ser null
metadata:
  type: project
---

**Achados em 20/09/2026** ao mapear `useSubmissaoFechamento.handleSave` para a fatia P10.
Nenhum estava listado em lugar nenhum. Somam-se aos dois já registrados em
[[dois-bugs-do-salvar-do-painel]].

## 1. 🔴 Salvar o dia APAGA a leitura-base, e o estoque dela não volta

O passo 0 (`useSubmissaoFechamento.ts:103`) apaga **todas** as `Leitura` do dia. O passo 2
(`:143`) só reinsere bicos cujo campo de fechamento está preenchido na tela:
`b => leituras[b.id] && leituras[b.id].fechamento`.

Bico com a **primeira foto do dia** lançada e ainda sem fechamento mostra `fechamento: ''`
(`useLeituras.ts:294-297`) — string vazia é falsy. **Fica de fora do reINSERT.**

Resultado: salvar o dia **destrói em silêncio** a leitura-base de qualquer bico ainda sem
fechamento, e o `Estoque` que aquela linha descontou **nunca é devolvido**. Vale também para
bico cuja `Leitura` existe no banco mas cujo campo final está em branco na tela.

## 2. 🪤 `parseValue` É `analisarValor` — e há um comentário afirmando o contrário

`utils/formatters.ts:83`: `export const parseValue = analisarValor;` — alias puro.

`utils/fechamentoMeios.ts:17-19` diz: *"`paraReais`/`parseValue` vêm de `./formatters` — nunca
`analisarValor`, que é o parser de encerrante e divide dinheiro por mil"*. **O comentário é
falso.**

Hoje não estoura porque `formatarValorAoSair` (`formatters.ts:236-240`) sempre devolve string
com vírgula e o parser cai no ramo seguro. Mas o `handleSave` usa a MESMA função em dinheiro
(`:173, :182, :212`) e em encerrante de bomba (`:147-148`). **Consequência para a P10: o
Command deve receber NÚMEROS, não strings** — replicar o parser em PHP replicaria a
ambiguidade.

## 3. O passo 5 grava `0`, nunca `null` — viola a I8

`:226` escreve `totalVendas` sempre; sem encerrante, `calcularTotais` devolve `0`. Mas
`fechamento.service.ts:163-167` e o `api-core` (`encerrante.ts:620,644-645`) gravam **null**
para "não apurado", conforme a migration `20260904_fechamento_nao_apurado_e_nulo.sql`.

É a divergência caminho A × B ([[dois-escritores-de-total-vendas]]) localizada na linha.

## 4. ✅ A janela de escrita EXISTE — decisão (e) respondida

Está no banco, não no app: `dentro_da_janela_de_escrita`
(`banco/init/01-esquema-base.sql:1120-1128`) = `data >= 2025-12-31 AND data < hoje + 2 dias`.
**Não são os "7 dias" nem "1,5 mês"** que estavam anotados. O §7 (e) do Design Doc não precisa
de decisão: precisa de cópia.

## O que isso impõe à P10

O Command **não pode recalcular** quatro coisas, e cada uma muda dinheiro em silêncio:
`total_vendas` (o preço vem do estado da tela, com preços editados do dia — o servidor
reprecificaria dia histórico), `diferenca`/`total_recebido` (a tela soma em float, o
`@posto/utils` em centavos), `valor_cartao` (é aditivo legado — derivar de débito+crédito
**dobra** o cartão) e `diferenca_calculada = 0` (é regra, não conta: calcular daria
`−conferido`, sobra fantasma).

**Duas decisões do dono continuam bloqueando a P10:** (b) Estoque no salvamento, e se o dia
sem encerrante grava `0` ou `null` — os dois são "o comportamento atual", de escritores
diferentes.

Ver [[total-vendas-vale-o-encerrante]] e o mapa completo em
`.claude/agent-memory/grafo/salvamento-do-fechamento-diario-sequencia.md`.
