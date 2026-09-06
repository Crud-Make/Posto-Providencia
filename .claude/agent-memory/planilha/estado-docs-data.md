---
name: estado-docs-data
description: docs/data/ tem 3 arquivos da planilha VELHA (07/08); a planilha NOVA (30/08) tem staging completo em docs/data-staging/2026-08-30/ e o xlsx em ~/Downloads
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

**Atualização 03/09/2026 — existem DUAS planilhas, e `docs/data/` é a velha.**
`docs/data/*.sqlite` continua sendo o ETL da planilha de 07/08 (não promovido).
A planilha de 30/08 (jan–ago, sha256 `3357eed9…`, caminho canônico em
`.claude/ativos-criticos.json`, hoje `~/Downloads/Posto,Jorro, 2026.xlsx`) tem
staging **completo** em `docs/data-staging/2026-08-30/staging.json/`:
`mes_01..08.json` (dia a dia, com `totais.falta` por frentista), `resumo.json`
(aba `POSTO JORRO 2026`: venda/compra/estoque por mês + seção `despesa` da
`Despeza, 2026.` + `custo_historico`), `despesa_lancada.json` (dump da tabela
`Despesa` do Supabase, por mês) e `manifesto.json` (hash + conciliação por mês).
Ao lado, `docs/data-staging/2026-08-30/posto_jorro_2026.sqlite/` guarda os 3
arquivos que substituiriam `docs/data/` na promoção.

**How to apply:** pergunta "contra a planilha nova" → staging de 30/08 (ou o
xlsx por `zipfile`, como `scripts/etl-estagio1-staging.py`); pergunta "contra o
que o golden usa hoje" → `docs/data/`. Dizer qual das duas foi usada, sempre —
a de 30/08 mudou o preço de janeiro no resumo e reescreveu julho. O hash
`abecc283…` citado acima é o da planilha velha, hoje só em
`/mnt/dados/backups-posto/`.
