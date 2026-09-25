---
name: gate-verde-sem-canario-nao-vale
description: Três gates deste repo passavam verdes sem olhar nada; a regra que saiu disso é que toda trava precisa de um canário que prove que ela reprova
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4039857e-c51b-48c2-afc1-0280fba0426d
  modified: 2026-09-18T09:11:37.559Z
---

Em 17–18/09/2026 apareceram **três** gates verdes que não verificavam nada:

1. **`.oxlintrc.json` não estava commitado.** O CI clonava um repo sem o arquivo, então
   `oxlint .` rodava com regras default e o gate de complexidade do §6 nunca existiu.
2. **O oxlint aceita regra type-aware e devolve zero.** Sondei: `typescript/no-floating-promises`
   na config **não dá erro de parse** (regra desconhecida dá), mas reporta 0 violações num arquivo
   que viola. Oxlint lê sintaxe, não tipos. ESLint type-aware pegou 4 de 4 no mesmo arquivo.
3. **O `pre-push` testava a árvore checada out, não o commit que sobe.** Dava para publicar branch
   quebrada estando com outra sadia no working tree.

**Why:** gate verde e gate morto são indistinguíveis de fora. O verde do CI dá a mesma sensação
nos dois casos — o que é pior do que não ter gate, porque produz confiança falsa.

**How to apply:** toda trava nova entra junto com um **canário**: um fixture que a viola de
propósito e um teste que falha se a trava NÃO acusar. O padrão já existia em
`.claude/hooks/testa-hooks.py` (que testa os hooks e passa) e foi replicado em
`frontend/apps/web/src/__canarios__/travas.test.ts` para o `neverthrow/must-use-result`. O
fixture fica em `ignores` do eslint e o teste o alcança com `--no-ignore`.

Mesma regra para suíte de teste: a de regressão sintética de dinheiro só foi считada pronta
depois de **teste de mutação** — quebrei `emCentavos`, `custoMedioCompra` e `diferenca` de
propósito e conferi que reprovava (9, 5 e 13 falhas). Suíte verde não prova nada por si.

Ver [[registro-de-regras-de-arquitetura]] e [[worktree-nao-herda-dependencias]].
