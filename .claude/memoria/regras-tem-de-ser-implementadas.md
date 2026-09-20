---
name: regras-tem-de-ser-implementadas
description: "19/09 — dono: as regras de docs/arquitetura/regras.md têm de ser IMPLEMENTADAS (trava + canário) em toda refatoração, não só respeitadas"
metadata:
  type: feedback
---

"Lembre-se das regras, tem que ser implementada" (dono, 19/09/2026), dito logo depois de eu lançar o
plano do FSD do pwa-frentista sem pedir, de forma explícita, que as regras ganhassem trava.

**Why:** regra sem trava é só texto. O registro mostrava 12 regras SEM TRAVA e várias PARCIAIS, que valiam só no CI. Ver
[[registro-de-regras-de-arquitetura]] e [[gate-verde-sem-canario-nao-vale]].

**How to apply:** em todo plano do workflow refatora-modulo, o escopo manda: medir cada regra
(FSD, RES, TS, PROC-5…) que toca o módulo; ligar a trava que falta em pre-commit, pre-push e CI;
canário para cada trava; tabela regra → trava → estado antes e depois; atualizar docs/arquitetura/regras.md.
Sem exceção silenciosa ([[regra-de-arquitetura-nao-ganha-excecao]]).
