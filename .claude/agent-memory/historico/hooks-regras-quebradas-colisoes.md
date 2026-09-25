---
name: hooks-regras-quebradas-colisoes
description: Os 6 hooks de 19/09 (issue #122 ampliada) — o que já usa legitimamente o que eles vão barrar, e de onde veio cada hook
metadata:
  type: project
---

Conferido 19/09/2026, base `40abfee` (origin/fase-a, merge do #125).

- `checklist-commit.py` nasceu em `33f8b97` (02/08/2026); o `git diff --cached` sem `cwd` é dessa
  linha e nunca foi mexido. Caso real do furo: `0af5e41` (18/09, 29 arquivos, sem CHANGELOG),
  entrada só em `b8f8c53`. Issue #122 (aberta 18/09) descreve os furos 1 e 5.
- `protege-git.py` nasceu em `de4c5e1` (29/07); o casamento por POSIÇÃO de segmento (não por aspas)
  veio em `857c0ef` (29/07) depois de barrar duas mensagens de commit que citavam a flag.
- **Uso legítimo de `-c core.hooksPath=/dev/null ... --no-verify`**: `scripts/hooks/testa-pre-push.sh:40`
  (entrou em `fa16841`, 18/09, PR #113) — canário do pre-push. Hook novo no protege-git não pode
  quebrar a execução desse script. `scripts/instala-hooks.sh:3` documenta que o repo NÃO usa
  core.hooksPath.
- **Uso legítimo de symlink**: `scripts/hooks/pre-push:156` faz `ln -sfn` de `docs/data` (não vendor).
  A memória `.claude/memoria/worktree-nao-herda-dependencias.md` (não rastreada em 19/09) manda
  "ligar os 7 node_modules" — contradiz um hook que barre symlink de node_modules.
- `so-fable-na-formula.py` só existia não rastreado no checkout principal (mtime 18/09 08:33),
  sem commit em branch nenhuma.

**Why:** planos de hook que ignoram esses usos quebram o canário do pre-push ou a receita de worktree.
**How to apply:** ao revisar/planejar hook de git ou de symlink, reconferir essas linhas antes.
