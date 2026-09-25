# Memória — agente `schema`

- [Portas de leitura do catálogo](portas-de-leitura-do-catalogo.md) — sem `SUPABASE_ACCESS_TOKEN` na sessão, MCP, CLI e OpenAPI falham; sondar com 1 chamada antes de auditar
- [Quem tipa o cliente Supabase](quem-tipa-o-cliente-supabase.md) — 4 esquemas convivem; o client usa o ESCRITO À MÃO, não o `generated.ts`; os 2 PWAs sem tipo
- [ETL grava em SQLite, não no Postgres](etl-grava-em-sqlite-nao-no-postgres.md) — as 11 tabelas do ETL não existirem em produção é o esperado, não drift
- [Esquema versionado em banco/init](banco-local-docker-espelha-producao.md) — desde 17/09 o DDL das 45 tabelas está no repo e bate 45/45 com produção; dados seguem gitignored
- [O núcleo do banco nunca veio de migration](nucleo-do-banco-nunca-veio-de-migration.md) — REVOGADA em parte: o DDL já está no repo; segue valendo que migration não é inventário
- [Leitura sem trava de magnitude](leitura-sem-trava-de-magnitude.md) — sem CHECK nem UNIQUE; a query de continuidade da cadeia é o detector de encerrante /1000
- [UI ou carga em lote?](como-saber-se-leitura-veio-da-ui-ou-de-carga.md) — o `createdAt` decide se um bug de front chegou ao dado gravado
