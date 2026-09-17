---
name: mover-apps-packages-para-frontend
description: O que amarra frontend/apps/ e frontend/packages/ à raiz do repo (issue #95, frontend/ vs backend/) — goldens acham docs/data por ../, hooks com âncora diferente, Root Directory da Vercel fora do repo, types.ts órfão
metadata:
  type: project
---

Inventário feito em 17/09/2026 para a Issue #95 (mover `frontend/apps/`, `frontend/packages/` e a toolchain TS
para `frontend/`). O que NÃO é óbvio e sobrevive ao move:

- **Os goldens localizam `docs/data` subindo diretórios a partir do próprio arquivo**
  (`${import.meta.dir}/../../../docs/data/...` em `frontend/packages/utils`, 5 a 7 níveis em
  `frontend/apps/web`). Mover `frontend/packages/`/`frontend/apps/` um nível para dentro quebra TODOS de uma vez,
  mesmo sem tocar em fórmula. Reconte:
  `rg -l -e 'import\.meta\.dir\}/(\.\./)+docs/data' -e "new URL\('(\.\./)+docs/data" apps packages`
- **Dois hooks casam o mesmo caminho de fórmula com âncora diferente:** `portao-golden.py`
  usa `(^|/)frontend/packages/utils/src/` (tolera prefixo `frontend/`), `checklist-commit.py` usa
  `^frontend/packages/utils/src/` sobre `git diff --name-only` (NÃO tolera). Confira:
  `rg -n -A2 'FORMULA = re.compile' .claude/hooks/portao-golden.py .claude/hooks/checklist-commit.py`
- **Root Directory dos 3 projetos Vercel não está no repo.** `vercel.json` não tem essa chave,
  `frontend/apps/pwa-dono/.vercel/project.json` só guarda ids; a única pista é comentário em
  `scripts/deploy-vercel.sh` (`rg -n 'Root Directory' scripts/deploy-vercel.sh`). É setting do painel.
- **`types.ts` da raiz é órfão.** Todo `from '../types'` em frontend/apps/web resolve para
  `frontend/apps/web/src/types` ou para `types.ts` da própria pasta. Símbolo exclusivo dele não aparece
  em lugar nenhum: `rg -l '\bLoanInstallment\b' apps packages` (vazio = segue órfão).
- **`.env`/`.env.local` da raiz servem os dois PWAs** (`envDir: '../../'` em
  `frontend/apps/pwa-*/vite.config.ts`) e o `scripts/reconsolidar-dia.ts` (autoload do Bun a partir
  do cwd). `frontend/apps/web` lê o próprio `frontend/apps/web/.env`. Mover a raiz TS sem mover o `.env` deixa
  os PWAs sem `VITE_SUPABASE_*`.
- **`scripts/reconsolidar-dia.ts` resolve `@posto/*` pelo `node_modules/@posto` da raiz**
  (symlinks para `../../packages/*`): `ls -la node_modules/@posto`. Se `node_modules` sair
  da raiz, o script perde a resolução.
- `rg` sem `-L` não segue symlink, mas `.claude/skills` deste repo NÃO é symlink (a cópia
  espelhada vive na pasta PAI, `SKILLS_PAI` em `higiene.py`): `ls -la .claude/skills | grep -c -- '->'` (0).

**Why:** o dono quer a lista exata antes do `git mv`; cada item acima foi confirmado por grep,
e o grafo (só AST) não enxerga json/yaml/md/sh — para inventário de caminho ele não ajuda.
**How to apply:** em qualquer pergunta sobre mover pasta de topo, comece pelos goldens
(`import.meta.dir`), pelos dois hooks e pelo `.env`; o resto é doc.
