# Memória — agente `schema`

- [Quem tipa o cliente Supabase](quem-tipa-o-cliente-supabase.md) — 4 esquemas convivem; o client usa o ESCRITO À MÃO, não o `generated.ts`
- [ETL grava em SQLite, não no Postgres](etl-grava-em-sqlite-nao-no-postgres.md) — as 11 tabelas do ETL não existirem em produção é o esperado, não drift
- [O núcleo do banco nunca veio de migration](nucleo-do-banco-nunca-veio-de-migration.md) — 26 tabelas sem `CREATE TABLE`; as 6 primeiras migrations são de outro projeto
