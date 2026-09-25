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
primeiro, Edge Functions + RPCs como primeira fatia, `frontend/apps/web` por último. Ver [[segundo-posto-cliente-novo]].

**Decisão do dono em 17/09:** foco só neste repo; toda referência ao projeto Laravel anterior foi apagada do repo e da memória a pedido dele. Não reintroduzir.

**Estado ao fim de 17/09 (branch `feat/#60-laravel-fase-a-esquema`, nada commitado):** decisão do dono
= Laravel no backend, telas como estão, banco em Docker. Criados e validados: `banco/init/*.sql`
(esquema completo, 45 tabelas), `banco/dados/cadastros.sql` (gitignored), `docker-compose.yml`
(Postgres 17 em :5433), `banco/README.md`, CHANGELOG. Container `posto-postgres` ficou no ar.
Próxima fatia proposta: `backend` Laravel no mesmo compose, começando pelas 2 Edge Functions e 3 RPCs.
Pendente do dono: o `CLAUDE.md` sobrescrito; PHP 8.5 e Composer 2.10 já estão na máquina.

**17/09, fim do dia:** milestone "Fase A — backend Laravel" e issues #94–#106 abertas (mãe: #60).
Sprint começa por #94 (Design Doc `docs/design/fase-a-laravel.md`, rascunhado, 4 DECISÕES
pendentes do dono) e #95 (raiz: `frontend/` + `backend/`, recomendação A). Dono disse "depois vamos
começar a sprint" — o próximo passo é ele aprovar o doc e as decisões.

**17/09, noite — #95 feita, sem push.** Branch `chore/#95-raiz-frontend-backend` (8 commits acima da
main, empilhada sobre `feat/#60-laravel-fase-a-esquema`): `frontend/` tem apps/, packages/ e a toolchain
TS; raiz tem banco/, docs/, scripts/, supabase/, compose. Tag `versao-testada-funcionando-pre-raiz`.
oxlint é o `bun run lint` (0,17 s); eslint em `lint:eslint`. Tudo verde. **Pendente do dono:** ok para
push/PR; Root Directory dos 3 projetos Vercel no painel (`frontend`, `frontend/apps/pwa-*`). Próxima: #96
(Laravel em `backend/`, exige ok para o composer). Armadilha vista: `bun add` fora de `frontend/` cria
package.json na raiz — sempre `cd frontend` antes.

**17/09, madrugada — #96 feita, sem push.** Branch `chore/#96-backend-laravel` sobre a #95: `backend/`
Laravel 13.32, `composer gates` (Pint, Larastan 6, PHPMD, Deptrac, Pest) verde, Boost instalado,
`docker compose up api` saudável. **Armadilha:** `artisan serve` descarta env do worker (lista fixa
`passthroughVariables`); no container usar `php -S`. Decisão 5: uma instalação por posto; banco
compartilhado "talvez sim" → `posto_id NOT NULL` + escopo global desde a #97. Pendências do dono:
ok para push/PRs (3 branches empilhadas), `fase-a` + proteção da main, Root Directory na Vercel.
Próxima: #97 (models do cadastro).

**17/09 — enviado.** `fase-a` criada da `main` e protegida (PR obrigatória, checks `build`+`backend`,
sem force push, sem delete); `main` com a mesma proteção. PRs empilhadas: **#107** (esquema → fase-a),
**#108** (raiz → #60), **#109** (backend → #95). CI roda em toda PR. Vercel faz preview por PR (falha
esperada nas de layout novo; produção só sai da `main`). Dois incidentes evitados, ambos por ferramenta:
(1) o cache do PHPStan serializa o ambiente com segredos — a proteção de push do GitHub barrou, história
reescrita antes de sair, `storage/framework/phpstan/` no .gitignore; (2) um `reset --soft` rodou na
branch errada (`fase-a`) porque um comando anterior falhou no meio — restaurado de `origin/fase-a`.
**Regra minha:** `git branch --show-current` antes de qualquer reset; nunca encadear checkout+reset num
comando que pode falhar antes.

**17/09 — fase-a completa e #97 em PR.** Mescladas na `fase-a`: #107 (esquema/regras), #109 (backend →
entrou na branch da #95), #110 (raiz + backend). A #108 foi FECHADA pelo GitHub quando a base sumiu e
não reabre — lição: **em pilha de PRs, mesclar de cima para baixo ou nunca apagar a branch-base antes
de reapontar**. #97 (módulo Cadastro: 12 models gerados do catálogo, `PertenceAoPosto`+`PostoAtual`,
`PostoPolicy`, catálogo só leitura, 28 testes contra o Postgres real, cobertura 100 %) na PR #111 →
fase-a. Testes de Feature do backend rodam no Postgres do compose com `DatabaseTransactions`: sem
isso gravam de verdade (aconteceu: 37 postos sintéticos, banco zerado e ressemeado). Próxima: #98 (OCR).

**20/09 — a sobrescrita do CLAUDE.md por template genérico ACONTECEU DE NOVO**, e desta vez estava
na árvore sem commit, prestes a apagar a 4.0. Sintomas para reconhecer: português quebrado ("Este
arquivo lodge os padrões", "1. 1. Visão Geral"), e fatos falsos sobre o próprio sistema — porta
5432 (é 5433), "22 tabelas de negócio" (são 45), Inertia + Fortify + Wayfinder (é SPA separado),
Redis no Compose (não existe), `.ai/guidelines/*` (não existe). Restaurado com `git restore
CLAUDE.md`; a versão ruim foi guardada no scratchpad da sessão.

**Isso já contaminou raciocínio:** o "22 tabelas" que eu repeti ao dono veio dessa versão
corrompida, carregada como instrução do projeto. Ao ver esses números, desconfiar do CLAUDE.md
antes de desconfiar do código.
