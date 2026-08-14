---
name: planilha-fonte-onde-esta
description: "A planilha real do posto vive em ~/Downloads, fora do repo — docs/data/ foi perdida em 07/08/2026 e não é recuperável do git"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b0cf8b27-0b49-44da-a82c-3a0c96c8839f
  modified: 2026-08-07T10:41:32.723Z
---

A fonte de tudo é `~/Downloads/Posto,Jorro, 2026.xlsx` — 965.079 bytes,
`sha256 abecc283c2398a9cf66184730066a3de82482b4f2f57bc8c3e66932ad67fc952`.
12 abas, meses 01 a 07 (julho com 25 dias preenchidos).

Isto precisa estar escrito em algum lugar porque **`docs/data/` não existe mais**
(constatado em 07/08/2026) e o diretório é gitignored: nada no repo diz onde a
planilha está. O commit `d4491b2` desversionou `docs/` em 29/07 prometendo "tudo
continua em disco"; um `git clean -fdx` depois disso levou a pasta. Os `.sqlite`
e o `.xlsx` nunca estiveram em commit nenhum — só esta planilha refaz a cadeia.

Recuperável do git, se precisar: `git show d4491b2^:docs/data/xlsx_to_csv.py` e
`:docs/data/migrate_frentista.py`. Os estágios 1 e 2 do ETL antigo **não** —
nunca foram versionados, porque moravam dentro de `docs/data/`.

O estágio 1 novo vive em `scripts/etl-estagio1-staging.py`, versionado de
propósito. Ver [[estado-etl-estagio2]].
