---
name: so-fable-mexe-em-formula
description: Desde 18/09/2026 só o Fable 5 edita regra de cálculo de dinheiro; hook so-fable-na-formula.py barra os outros modelos (falha fechada)
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7e065856-6167-4f63-a45d-192505fb0cad
  modified: 2026-09-18T11:35:11.882Z
---

Decisão do dono em 18/09/2026: "quando formos mexer na regra de cálculos, só iremos usar o Fable 5".

Trava: `.claude/hooks/so-fable-na-formula.py` (PreToolUse em Write|Edit|NotebookEdit|Bash, 1º da lista no
`.claude/settings.json`). Cobre `packages/utils/src/*.ts` (não os testes comuns), `*.golden.spec.ts`,
`*.regressao.test.ts` e `aggregator.service.ts`. Ler é livre. O modelo sai do transcript (`message.model`);
para subagente cuja 1ª ação é a edição, o transcript ainda está vazio → vale o `model` do
`agent-<id>.meta.json` (só existe quando o modelo foi pedido explicitamente) → senão o da sessão.
Esse furo foi achado no canário ao vivo: sem o meta, o Fable era barrado como "desconhecido".
Canários ao vivo em 18/09: Opus barrado, Sonnet barrado, Fable passou. 21 casos em `testa-hooks.py`.

**Why:** o dono quer o modelo mais forte em toda mudança de fórmula de dinheiro.
**How to apply:** tarefa que toca fórmula → `/model fable` na sessão, ou `model: 'fable'` no Agent/agent().
Fórmula no backend (Value Objects de dinheiro no Laravel, #100) ainda NÃO está no regex — acrescentar
quando existir. Continua valendo golden master ([[gate-verde-sem-canario-nao-vale]]).
