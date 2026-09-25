---
name: carga-local-postgres-pelos-scripts-sql
description: Como pôr dado transacional (Leitura/Compra/Despesa) no Postgres local do compose sem tocar Supabase nem docs/data — os carga-historico-*.py só emitem SQL
metadata:
  type: reference
---

O Postgres do compose (`banco/README.md`, porta 5433) sobe só com cadastro (`banco/dados/cadastros.sql`,
gitignored, existe só no checkout principal — worktree não herda). Dado transacional para validar
tela/endpoint localmente sai dos scripts `scripts/carga-historico-{leitura,compra,despesa}.py <mes> --sql`
(despesa exige `--fonte planilha`): eles LEEM `docs/data/posto_jorro_2026.sqlite` e só imprimem SQL
(POSTO_ID=1, FORNECEDOR_ID=3, bicos 7–12). Canalizar para `docker compose exec -T postgres psql -U posto -d posto`.
Atenção: o de despesa emite `DELETE FROM "Despesa" WHERE posto_id=1` antes do INSERT — só aponte para o local.

Conferido 18/09/2026:
`grep -n "Uso:\|--sql\|INSERT INTO\|DELETE\|^POSTO_ID" scripts/carga-historico-*.py; grep -n Fornecedor banco/dados/cadastros.sql`

Painel com VITE_API_URL local continua lendo o resto do Supabase de produção (frentista, FechamentoFrentista,
estoque): tela mista. Relacionado: [[api-core-nao-le-compra-nem-tanque]], [[timestamps-leitura-em-utc]].
