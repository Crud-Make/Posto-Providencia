---
name: etl-grava-em-sqlite-nao-no-postgres
description: As tabelas do ETL (encerrante_diario, fechamento_diario etc.) são SQLite local por design — ausência delas no Postgres não é drift
metadata:
  type: project
---

`scripts/etl-estagio2-carga.py` grava em **SQLite**, não no Supabase
(`sqlite3.connect` nas linhas ~601-608 → `docs/data/posto_jorro_2026.sqlite` e
`docs/data/janeiro_referencia.sqlite`). Conferido em **12/08/2026**.

Portanto `encerrante_diario`, `resumo_mensal_bico`, `validacao_mensal`,
`compra_mensal`, `estoque_mensal`, `despesa_categoria_mensal`, `despesa_mensal`,
`despesa_lancada`, `venda_frentista_diaria`, `frentista_dia_total`,
`fechamento_diario` **não existem no Postgres — e não deveriam**.

**Why:** numa auditoria de drift é natural cruzar a lista do ETL com o catálogo e
concluir "11 tabelas faltando em produção". É falso positivo: são artefatos da
fonte auditável local (§6), fora do git.

**How to apply:** as **únicas** tabelas Postgres que o ETL toca são `Despesa`
(lida por `scripts/etl-despesa-banco.py` via API REST) e `Leitura` (escrita por
`scripts/carga-historico-leitura.py`). Só essas duas entram numa comparação
contra o catálogo vivo.

Reconferir:
```bash
grep -nE "sqlite3\.connect|CREATE TABLE" scripts/etl-estagio2-carga.py | head -20
```
