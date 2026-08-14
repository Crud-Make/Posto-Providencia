---
name: views-auto-atualizaveis-furam-rls
description: View sem security_invoker roda como dono e ignora a RLS da tabela base — se for auto-atualizável e tiver grant ao anon, é DELETE anônimo na tabela base
metadata:
  type: project
---

View do schema `public` criada sem `security_invoker=on` executa com os privilégios do
**dono** (aqui, `postgres`). Como nenhuma tabela do projeto tem `FORCE ROW LEVEL SECURITY`,
o dono **ignora toda a RLS** da tabela base. Se a view for auto-atualizável (SELECT simples,
um FROM, sem agregação) e o `anon` tiver grant de escrita nela, o `anon` escreve na tabela
base **sem passar por política nenhuma**.

**Why:** apurado em 12/08/2026. `vw_lucro_periodo` (sobre `Fechamento`) e `frentistas`
(sobre `Frentista`) estavam nesse estado, com `INSERT/UPDATE/DELETE` para `anon`. A
`Fechamento` não tem política de DELETE para anon — a view era o caminho que anulava isso.
O `get_advisors` marca como ERROR `security_definer_view`, mas o texto do lint fala de
leitura; o buraco de **escrita** só aparece cruzando com `pg_relation_is_updatable` e o ACL.

**How to apply:** toda auditoria cruza as três coisas — `security_invoker`,
`pg_relation_is_updatable` e grant ao `anon` (consultas em [[consultas-de-enumeracao]]).
Uma tabela pode estar corretamente fechada e mesmo assim ser gravável por fora, via view.
Antes de recomendar `DROP VIEW`, confira se o app usa: em 12/08/2026 as duas só apareciam
em `apps/web/src/types/database/generated.ts` (tipo gerado), nenhuma consulta real.
