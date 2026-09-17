---
name: quem-tipa-o-cliente-supabase
description: Quatro definições de esquema convivem; o cliente Supabase do frontend/apps/web é tipado pelo schema ESCRITO À MÃO, não pelo generated.ts
metadata:
  type: project
---

Existem **quatro** descrições do esquema no repo, e a que parece canônica não é a
que vale. Conferido em **12/08/2026**.

| Arquivo | Origem | Quem usa |
|---|---|---|
| `frontend/apps/web/src/types/database/generated.ts` | Supabase CLI | **ninguém tipa o client com ele** |
| `frontend/apps/web/src/types/database/schema.ts` + `tables/*.ts` | **mão** | **é o `Database` do `createClient`** |
| `frontend/packages/types/src/database.types.ts` | Supabase CLI | **zero importadores** (órfão) |
| `frontend/packages/types/src/database/tables/operacoes.ts` | mão | só `Frentista`, `Produto`, `Escala`, `NotaFrentista` |

**Why:** `frontend/apps/web/src/services/supabase.ts:2` faz
`import type { Database } from '../types/database'` — que resolve para o
`schema.ts` manual. O `generated.ts` é o único quase em dia com o catálogo e
**não tipa nada**. Corrigir drift regenerando o `generated.ts` não conserta
consulta nenhuma.

**How to apply:** ao reportar drift de tipo, diga sempre *qual dos quatro*. Drift
no manual é o que quebra em runtime; drift no `generated.ts` é cosmético
enquanto ele não for plugado no `createClient`.

O `frontend/apps/pwa-frentista` chama `createClient` **sem genérico**
(`frontend/apps/pwa-frentista/src/lib/supabase.ts:6`) — sem tipagem alguma. **Idem o
`frontend/apps/pwa-dono`** (`frontend/apps/pwa-dono/src/lib/supabase.ts:6`), reconferido em
**17/09/2026**. Os dois PWAs somam nove tabelas em `.from()` sem tipo — entre
elas `InscricaoPush` e `PresencaFrentista`, que **nem o `generated.ts` conhece**.

Também em 17/09/2026: o `generated.ts` do `frontend/apps/web` foi gerado pela última vez
em **02/08/2026** (commit `09eb717`) e o `database.types.ts` do `frontend/packages/types`
em **25/01/2026** (`c38351c`). Nenhum dos dois reflete as migrations de 13/08 em
diante. O schema **manual** (`schema.ts`) é o único que já tem `PresencaFrentista`
— e é o único que falta `AuditoriaDados`. Comando que mede isso, em vez de lista:

```bash
git log -1 --format='%h %ad' --date=short -- frontend/apps/web/src/types/database/generated.ts
git log -1 --format='%h %ad' --date=short -- frontend/packages/types/src/database.types.ts
diff <(sed -E 's/^[[:space:]]+//' frontend/packages/types/src/database.types.ts) \
     <(sed -E 's/^[[:space:]]+//' frontend/apps/web/src/types/database/generated.ts) | grep -cE '^[<>]'
```
(o `sed` é obrigatório: um arquivo indenta com 2 espaços, o outro com 4, e o
`diff -u` cru marca as 4.128 linhas como diferentes.)

Reconferir:
```bash
grep -rn "createClient<" apps packages --include=*.ts | grep -v node_modules
grep -rn "database.types" packages apps --include=*.ts --include=*.tsx | grep -v node_modules
```

Ver [[etl-grava-em-sqlite-nao-no-postgres]] e [[nucleo-do-banco-nunca-veio-de-migration]].
