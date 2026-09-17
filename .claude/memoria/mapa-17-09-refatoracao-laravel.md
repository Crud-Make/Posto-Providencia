---
name: mapa-17-09-refatoracao-laravel
description: "17/09/2026 — decidido: Laravel no backend, telas ficam, banco próprio; banco/ + docker-compose criados e validados; mapa em .claude/docs/mapa-do-sistema-17-09-2026.md; token renovado"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8a60e30f-1e82-4d12-9c04-a904b9d5e1a4
  modified: 2026-09-17T09:45:49.496Z
---

Em 17/09/2026 o dono abriu a sessão com "teremos que refatorar esse sistema inteiro e adicionar
Laravel e Postgres no Docker, vamos mapear tudo". Seis agentes mapearam; consolidado em
`.claude/docs/mapa-do-sistema-17-09-2026.md` (não commitado na hora, branch `feat/#93-esquema-base`).

Fatos que não estão no repo:
- **Issue #60 (28/08)** já decidiu "Laravel + VPS, Fase A só persistência/auth, utils intocado";
  11 tarefas pendentes, 0 comentários, nada no CHANGELOG. **Issue #93 (07/09)** diz o oposto
  ("um Supabase por cliente"). As duas competem pelas mesmas semanas; a tarefa bloqueante é a mesma:
  dump do esquema (24 de 43 tabelas sem CREATE TABLE no repo; núcleo inteiro sem DDL).
- **Token do MCP renovado em 17/09** em `.claude/settings.local.json`. O MCP da sessão só relê ao
  reconectar (`/mcp`). `supabase db dump` não funciona aqui (IPv6 ou senha do banco); o caminho é a
  Management API, read-only, via `scripts/extrai-esquema-do-catalogo.py`.
- No mesmo dia, o dono **sobrescreveu o CLAUDE.md 3.3 (436 linhas) por um template genérico
  Laravel/CQRS/Redis/Locust (59 linhas)**, não commitado. Os 8 hooks em `.claude/hooks/` leem o
  CLAUDE.md; `testa-hooks.py` cobra coisas que sumiram. Recomendei guardar o template como design
  doc e manter §0/§6/§7/§9/§14 do 3.3 — ver como ficou antes de assumir qualquer regra.

**Why:** o dono é quem decide o rumo, mas as decisões (#60 × #93, fórmula em TS ou PHP) ainda estavam abertas ao fim de 17/09.
**How to apply:** antes de qualquer fatia de Laravel, conferir se o token foi renovado, se o dump
entrou no repo, e qual CLAUDE.md está valendo. Caminho recomendado: strangler, Postgres em Docker
primeiro, Edge Functions + RPCs como primeira fatia, `apps/web` por último. Ver [[segundo-posto-cliente-novo]].

**Decisão do dono em 17/09:** foco só neste repo; toda referência ao projeto Laravel anterior foi apagada do repo e da memória a pedido dele. Não reintroduzir.

**Estado ao fim de 17/09 (branch `feat/#60-laravel-fase-a-esquema`, nada commitado):** decisão do dono
= Laravel no backend, telas como estão, banco em Docker. Criados e validados: `banco/init/*.sql`
(esquema completo, 45 tabelas), `banco/dados/cadastros.sql` (gitignored), `docker-compose.yml`
(Postgres 17 em :5433), `banco/README.md`, CHANGELOG. Container `posto-postgres` ficou no ar.
Próxima fatia proposta: `apps/api` Laravel no mesmo compose, começando pelas 2 Edge Functions e 3 RPCs.
Pendente do dono: o `CLAUDE.md` sobrescrito; PHP 8.5 e Composer 2.10 já estão na máquina.

**17/09, fim do dia:** milestone "Fase A — backend Laravel" e issues #94–#106 abertas (mãe: #60).
Sprint começa por #94 (Design Doc `docs/design/fase-a-laravel.md`, rascunhado, 4 DECISÕES
pendentes do dono) e #95 (raiz: `frontend/` + `backend/`, recomendação A). Dono disse "depois vamos
começar a sprint" — o próximo passo é ele aprovar o doc e as decisões.
