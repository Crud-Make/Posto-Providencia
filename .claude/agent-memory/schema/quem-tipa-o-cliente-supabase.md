---
name: quem-tipa-o-cliente-supabase
description: Quatro definições de esquema convivem; o cliente Supabase do apps/web é tipado pelo schema ESCRITO À MÃO, não pelo generated.ts
metadata:
  type: project
---

Existem **quatro** descrições do esquema no repo, e a que parece canônica não é a
que vale. Conferido em **12/08/2026**.

| Arquivo | Origem | Quem usa |
|---|---|---|
| `apps/web/src/types/database/generated.ts` | Supabase CLI | **ninguém tipa o client com ele** |
| `apps/web/src/types/database/schema.ts` + `tables/*.ts` | **mão** | **é o `Database` do `createClient`** |
| `packages/types/src/database.types.ts` | Supabase CLI | **zero importadores** (órfão) |
| `packages/types/src/database/tables/operacoes.ts` | mão | só `Frentista`, `Produto`, `Escala`, `NotaFrentista` |

**Why:** `apps/web/src/services/supabase.ts:2` faz
`import type { Database } from '../types/database'` — que resolve para o
`schema.ts` manual. O `generated.ts` é o único quase em dia com o catálogo e
**não tipa nada**. Corrigir drift regenerando o `generated.ts` não conserta
consulta nenhuma.

**How to apply:** ao reportar drift de tipo, diga sempre *qual dos quatro*. Drift
no manual é o que quebra em runtime; drift no `generated.ts` é cosmético
enquanto ele não for plugado no `createClient`.

O `apps/pwa-frentista` chama `createClient` **sem genérico**
(`apps/pwa-frentista/src/lib/supabase.ts:6`) — sem tipagem alguma.

Reconferir:
```bash
grep -rn "createClient<" apps packages --include=*.ts | grep -v node_modules
grep -rn "database.types" packages apps --include=*.ts --include=*.tsx | grep -v node_modules
```

Ver [[etl-grava-em-sqlite-nao-no-postgres]] e [[nucleo-do-banco-nunca-veio-de-migration]].
