---
name: claude-md-4-vale-desde-18-09
description: "Desde 18/09/2026 o CLAUDE.md é a versão 4.0 (regras da refatoração Laravel, spec-driven, quality gates); o 3.3 está arquivado; não propor reverter"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8a60e30f-1e82-4d12-9c04-a904b9d5e1a4
  modified: 2026-09-17T10:09:15.324Z
---

Em 17/09/2026 o dono substituiu o `CLAUDE.md` 3.3 por um conjunto novo de regras para a
refatoração com Laravel 13 + Postgres em Docker (spec-driven, 5 níveis de zoom, CQRS, quality
gates PHPMD/PHPStan/Deptrac/Pest 85 %, workflows ultracode). Eu apontei o que ele apagava
(golden, docs/data, hooks) e ele reafirmou: **"na próxima sessão as novas regras já têm que
valer"**. Ficou assim:

- `CLAUDE.md` = versão 4.0. Ganhou um **§0 "Ponte"** que diz o que existe no repo hoje, que os
  §5–§7 (ferramental PHP) só entram em vigor quando `backend` existir, e que os invariantes de
  dinheiro (golden master, `docs/data` gitignored, nunca `bun test` puro, skills de domínio) e de
  git (nunca main, sem force push, CHANGELOG, sem push sem ok) continuam.
- O 3.3 inteiro está em `.claude/docs/claude-md-3.3-arquivado.md`.
- `docs/architecture.md` criado (Mermaid + tabela de dependências) e o agente
  `doc-cycle-onboard` existe para atualizá-lo (somente leitura, devolve patch).
- Antes de qualquer módulo: Design Doc em `docs/design/<slug>.md`. Antes de refatorar: issues no
  GitHub para acompanhar (proposta de 12 issues + milestone feita em 17/09, aguardando ok).

**Why:** o dono quer processo formal (spec, issues, gates) para a refatoração grande, e é
decisão dele. Já discordei uma vez; reafirmado, não se relitiga.
**How to apply:** seguir o 4.0 como está. Não sugerir voltar ao 3.3. Se uma regra do 4.0
colidir com invariante de dinheiro, o §0 do próprio 4.0 já resolve: golden e skills vencem.
Ver [[mapa-17-09-refatoracao-laravel]].
