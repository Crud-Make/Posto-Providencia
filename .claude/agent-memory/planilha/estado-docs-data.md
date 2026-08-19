---
name: estado-docs-data
description: docs/data/ voltou parcialmente em 16/08/2026 — só 3 arquivos; staging do ETL, scripts e xlsx continuam ausentes
metadata:
  type: project
---

`docs/data/` **existe de novo** (conferido 16/08/2026), mas só com 3 arquivos:

- `posto_jorro_2026.sqlite` — saída do ETL, **12 tabelas** (não 17)
- `janeiro_referencia.sqlite` — golden master (`jan_encerrante`, `jan_frentista`)
- `fixture_lucro_custo_mes01.json` — fixture de lucro/custo do mês 01, com
  agregados que **não existem em nenhuma tabela** (custo operacional por litro)

**Continuam ausentes:** `etl_2026/` inteiro (staging `mes_NN.json`,
`etl_stage1.py`, `etl_stage2.py`) e `atualizado_2026-07-26.xlsx`.

**Why:** a instrução do agente ainda diz "docs/data/ não existe" e lista 17
tabelas + staging + xlsx. Duas dessas afirmações estão erradas hoje, e agir por
elas leva a recusar consulta que dá para responder, ou a prometer procedência
(staging, fórmula do xlsx) que não tem como entregar.

**How to apply:** o check de existência do primeiro comando continua valendo,
mas agora o resultado esperado é "existe, com 3 arquivos". Pergunta de
**"de onde o ETL tirou isso"** (staging) segue sem fonte. Pergunta de **valor**
é respondível normalmente.

**Pergunta de fórmula voltou a ter fonte em 16/08/2026:** o xlsx original está
em `/home/thygas/Downloads/Posto,Jorro, 2026.xlsx` (965.079 bytes, sha256
`abecc283c2398a9cf66184730066a3de82482b4f2f57bc8c3e66932ad67fc952` — conferir o
hash antes de usar). **Não está em `docs/data/`**; o caminho da instrução
(`docs/data/atualizado_2026-07-26.xlsx`) continua inexistente. Ver
[[mapa-aba-posto-jorro-2026]] para a estrutura já mapeada.

Ver [[tabelas-que-existem-de-fato]] e [[onde-para-cada-fonte]].
