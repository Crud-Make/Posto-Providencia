---
name: regras-md-nao-acompanhou-as-travas
description: docs/arquitetura/regras.md (1d24d30 17/09, 30c89e7 18/09) ficou atrás das travas — 35377c8 e e29a0b8 (18/09) instalaram RES-2/TS-1..4/FSD-1..3 sem tocar no registro; FSD só vale para apps/web
metadata:
  type: project
---

Conferido em 19/09/2026 na `origin/fase-a` (40abfee).

- `docs/arquitetura/regras.md` só foi tocado por `1d24d30` (17/09/2026) e `30c89e7`
  (18/09/2026, CA-7). As linhas FSD-1..3, RES-1..4 e TS-1..5 ainda dizem "DECIDIDA".
- Quem instalou de fato, sem atualizar o registro:
  - `35377c8` (18/09/2026) — neverthrow + `neverthrow/must-use-result` + `projectService`.
    O corpo diz "RES-1..4 saem de DECIDIDA para instalado", mas o arquivo não mudou.
  - `e29a0b8` (18/09/2026) — catraca, strict-boolean, no-floating-promises, FSD por
    `eslint-plugin-boundaries` + Public API por `no-restricted-imports`.
  - `7eea08c` (18/09/2026) — regex `@/?` e `--no-inline-config` na catraca.
- **O FSD de `e29a0b8` só enxerga `apps/web/src`** (`boundaries/elements`,
  `frontend/eslint.config.mjs:48-55`). pwa-frentista e pwa-dono ficam de fora.

**Why:** quem ler só o regras.md subestima o que já está travado e superestima o
alcance do FSD.

**How to apply:** para "a regra X tem trava?", leia o registro **e depois** o
`git log` de `frontend/eslint.config.mjs` e de `frontend/.catraca/`. Não confie na
coluna de estado sem reconferir o commit.
