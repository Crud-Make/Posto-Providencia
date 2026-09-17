---
name: saneamento-em-tres-worktrees
description: O saneamento pré-release roda em worktrees paralelas com partilha por arquivo; worktree nova não herda docs/data nem node_modules e o golden quebra sem aviso
metadata: 
  node_type: memory
  type: project
  originSessionId: 196a8def-ca06-4d1b-8824-4b4e1dc83193
  modified: 2026-08-29T00:16:25.237Z
---

Desde 28/08/2026 o saneamento pré-release roda em **worktrees paralelas**, uma por trilha, com a
partilha **por arquivo** escrita em `.claude/docs/saneamento-pre-release.md`. Funcionou: duas
sessões escreveram em paralelo por ~40 min e o merge deu conflito só em `CHANGELOG.md` e no próprio
documento — **zero conflito de código**.

**Why:** dois agentes na mesma árvore se atropelam, e a divisão por *tarefa* não basta — três
arquivos (`aggregator.service.ts`, `fechamento-mensal/index.tsx`, `useCalculoGestaoBicos.ts`)
apareciam nas duas listas e teriam colidido. A partilha só segura se for por caminho de arquivo.

**How to apply:** ao abrir uma worktree nova neste repo, três coisas **não** vêm de graça, e as três
falham em silêncio:

1. **`docs/data/` é gitignored** — não existe na worktree nova, e os 5 golden masters estouram no
   `new Database()`. Symlink para a árvore principal resolve. `docs/data-staging/` idem.
2. **`node_modules` não é compartilhado** — `bun install` na worktree. E depois de um merge que
   mexa em `package.json`, **rodar `bun install` de novo**: o `type-check` quebra com erro que
   parece de código (`Property 'dir' does not exist on type 'ImportMeta'`) quando na verdade é
   dependência faltando.
3. **`.env` fica em `frontend/apps/web/.env` e na raiz** (não `.env.local`), também gitignored — sem ele o
   `bun run dev` sobe mas o Supabase não conecta.

Ordem de merge que usamos: a trilha estrutural (menor, sem dinheiro) primeiro, a de fórmula em cima.
Ver [[zerado-28-08-carga-conferida-pendente]] — o replay de dado segue **parado por decisão do
dono**, esperando a auditoria de outra sessão; o saneamento é de código e não encosta nisso.
