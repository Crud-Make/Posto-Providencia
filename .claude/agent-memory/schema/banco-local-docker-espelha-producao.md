---
name: banco-local-docker-espelha-producao
description: Desde 17/09/2026 o DDL inteiro (45 tabelas) está versionado em banco/init/01-esquema-base.sql e bate 45/45 com o catálogo de produção; docker-compose sobe Postgres 17 em :5433
metadata:
  type: project
---

O esquema **deixou de viver só no Supabase**. Commit `b8fb465` (17/09/2026, branch
`fase-a`) trouxe `banco/init/01-esquema-base.sql` — gerado por
`scripts/extrai-esquema-do-catalogo.py` a partir do catálogo de produção pela
Management API, não escrito à mão. `docker-compose.yml` sobe Postgres 17 em
`localhost:5433` e aplica `banco/init/*.sql` no primeiro boot.

**Why:** era o bloqueio nº 1 da Issue #93 (segundo posto) e da #60 (cutover): sem
DDL versionado não havia como instanciar o sistema fora daquele projeto Supabase.
Isto **revoga a parte "não está no repo"** de
[[nucleo-do-banco-nunca-veio-de-migration]] — o que continua verdadeiro lá é que o
*histórico de migrations* não descreve o núcleo, e que as primeiras migrations são
de outro sistema.

**How to apply:** ao auditar esquema, `banco/init/01-esquema-base.sql` é hoje o
retrato mais fiel do catálogo no repo — mais do que qualquer `.ts` gerado
(ver [[quem-tipa-o-cliente-supabase]]) e mais do que `supabase/migrations/`. Não é
sequência, é estado final: não procure história nele.

Três armadilhas confirmadas em 20/09/2026:

- `banco/dados/cadastros.sql` é **gitignored** (`.gitignore:37`, nome/CPF de
  frentista pelo §6). Quem clona o repo sobe o banco **vazio** — há caminho de
  esquema, não há caminho de dados versionado.
- `backend/database/migrations/` tem só as **3 migrations de fábrica** do Laravel
  (`users`, `cache`, `jobs` — 8 tabelas). Elas **não** criam o esquema de negócio e
  nenhuma das 8 existe em produção. `composer setup` roda `artisan migrate`, que
  criaria essas 8 dentro do banco `posto`. O esquema de negócio nasce do
  `docker-entrypoint-initdb.d`, não do Eloquent.
- O `00-papeis-e-stubs.sql` cria `auth.users` como stub de 4 colunas: toda policy
  "para autenticados" **nega** no local. É intencional — quem autoriza passa a ser
  o backend.

Reconferir a equivalência (o comando, nunca a contagem):
```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
S="${TMPDIR:-/tmp}/esq-$$"; mkdir -p "$S"
git show origin/fase-a:banco/init/01-esquema-base.sql \
  | grep -oE 'CREATE TABLE (IF NOT EXISTS )?"?public"?\."?[A-Za-z_]+"?' \
  | sed -E 's/.*\.//; s/"//g' | sort -u > "$S/repo.txt"
# grave o SELECT table_name FROM information_schema.tables WHERE table_schema='public'
# AND table_type='BASE TABLE' em "$S/vivo.txt", depois:
diff -u "$S/repo.txt" "$S/vivo.txt"
```
Em **20/09/2026** esse diff saiu **vazio**: 45 tabelas dos dois lados, zero drift.
