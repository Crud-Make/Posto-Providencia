---
name: multi-tenant-impossivel-sem-migration
description: 20/09 — CINCO uniques de tabela escopada não incluem posto_id; o banco RECUSA o segundo posto. Fechamento (data, turno_id) é o pior: dois postos não podem fechar o mesmo dia
metadata:
  type: project
---

**Medido no catálogo em 20/09/2026**, achado por um teste que tentou dar a dois postos estoque
do mesmo combustível e levou violação de unique.

> **Multi-tenant é impossível hoje.** Não é "precisa de ajuste": o banco **recusa** o segundo
> posto. É bloqueio, não melhoria.

| unique sem `posto_id` | o que impede |
|---|---|
| **`Fechamento (data, turno_id)`** | **dois postos não podem fechar o MESMO DIA** — e `turno_id` é sempre 1 |
| `Estoque (combustivel_id)` | dois postos não podem ter gasolina |
| `Configuracao (chave)` | configuração é global, não por posto |
| `Fornecedor (cnpj)` | o mesmo distribuidor não serve dois postos |
| `Frentista (cpf)` | a mesma pessoa não trabalha em dois |

**Quatro outros estão OK**, porque o pai já é escopado: `Bico (bomba_id, numero)`,
`Escala (frentista_id, data)`, `FechamentoFrentista (fechamento_id, frentista_id)` e
`Leitura (bico_id, data)`.

Reconferir a qualquer momento:
```sql
with escopadas as (select table_name from information_schema.columns
                   where table_schema='public' and column_name='posto_id')
select t.relname, pg_get_indexdef(i.indexrelid)
from pg_index i join pg_class t on t.oid=i.indrelid join escopadas e on e.table_name=t.relname
where i.indisunique and not i.indisprimary
  and pg_get_indexdef(i.indexrelid) not like '%posto_id%';
```

**Está travado por teste:** `backend/tests/Feature/Estoque/DescontaLitrosVendidosTest.php`, o caso
"🔴 BLOQUEIO DE MULTI-TENANT". Ele **afirma** a limitação e fica vermelho no dia em que a
migration incluir `posto_id` — que é o que se quer de um bloqueio conhecido. A regra TEN-5 de
`docs/arquitetura/regras.md` era ❌ SEM TRAVA até 20/09; agora tem teste e lista medida.

**Prioridade recomendada em 20/09:** a migration dos cinco uniques vale mais que a P10. Ela é
DDL, não toca fórmula, e qualquer coisa construída sobre multi-tenant antes dela está sobre um
banco que recusa o segundo cliente. Ver [[porque-multitenant-e-o-destino]].
