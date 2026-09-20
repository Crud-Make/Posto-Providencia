---
name: travas-catraca-pr-119
description: 18/09 — flags estritas do TS, strict-boolean, floating-promises e FSD entraram sob catraca no PR #119, empilhado sobre feat/result-pattern-neverthrow (sem PR)
metadata:
  type: project
---

PR #119 (`chore/travas-catraca`, worktree `../pp-travas`) tem **base `feat/result-pattern-neverthrow`**,
que em 18/09 ainda não tinha PR; ela carrega o `strict` (chore/tsconfig-strict) e o neverthrow.
Ordem de merge: strict → neverthrow → #119.

Dívida congelada em `frontend/.catraca/`: tsc 558, eslint 614 (545 strict-boolean, 69 floating).
Pagar dívida = corrigir e rodar `bun run catraca:atualizar` (só desce).

**Why:** o dono escolheu catraca em vez de corrigir ~1.170 erros de uma vez, porque vários
estão em fórmula de dinheiro.
**How to apply:** nunca usar `--aceitar-divida` nem eslint-disable sem o dono pedir. Depois do
merge: `scripts/instala-hooks.sh` e atualizar `docs/arquitetura/regras.md`. O push da worktree
falhou 1x por falta de `backend/vendor` — ver [[worktree-nao-herda-dependencias]].
Ver [[gate-verde-sem-canario-nao-vale]].

**Atualização 18/09 (fim):** o checkout principal está na branch LOCAL `integra/travas` =
docs/#60 + chore/travas-catraca (#119) + chore/travas-laravel (sem push). Hooks do Claude
`trava-ts.py` e `trava-php.py` ativos; git hooks reinstalados a partir dela. O pre-push instalado
é o da docs/#60 (testa a ÁRVORE) — o que testa o commit está em `fix/pre-push-testa-o-que-sobe`,
ainda fora da integração. Quando os PRs mergearem, voltar o checkout para a base oficial.
