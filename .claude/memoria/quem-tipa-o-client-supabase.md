---
name: quem-tipa-o-client-supabase
description: O database.types.ts gerado tem ZERO importadores — quem tipa o client é um schema escrito à mão; regenerar o gerado não corrige consulta nenhuma
metadata:
  node_type: memory
  type: project
---

Apurado em **12/08/2026** pelo agente `schema`, e conferido no arquivo. É a
armadilha que faz perder tempo consertando o arquivo errado.

Existem **quatro** descrições do esquema no repo, e **a que parece canônica não é a
que vale**:

| Arquivo | Origem | Papel real |
|---|---|---|
| `packages/types/src/database.types.ts` | Supabase CLI | **zero importadores**, 1611 linhas mortas |
| `apps/web/src/types/database/generated.ts` | Supabase CLI | quase em dia — **e não tipa nada** |
| `apps/web/src/types/database/schema.ts` + `tables/*.ts` | **mão** | **é o `Database` do `createClient`** |
| `packages/types/src/database/tables/operacoes.ts` | mão | só `Frentista`, `Produto`, `Escala` |

`apps/web/src/services/supabase.ts:2` importa `Database` de `../types/database` —
o **escrito à mão**. E `apps/pwa-frentista/src/lib/supabase.ts` chama `createClient`
**sem genérico**: o app que grava o fechamento não tem tipagem alguma.

**Consequência prática:** rodar `generate_typescript_types` e salvar por cima do
gerado não muda o comportamento de nenhuma consulta. Drift de tipo se conserta em
`apps/web/src/types/database/tables/*.ts`.

**Drift real conferido no catálogo vivo** (`FechamentoFrentista`):

- `diferenca` — **não existe no banco**, mas está como `number` obrigatório em
  `packages/types/src/database/tables/operacoes.ts:96`. Coluna fantasma.
- `baratencia` e `data_hora_envio` — existem no banco, **ausentes** no manual ativo.
- `encerrante`, `baratao`, `diferenca_calculada`, `posto_id` — **nullable no banco**,
  não-nulos no repo. `diferenca_calculada` é a diferença canônica do §6: dinheiro
  chegando nulo num tipo que prometeu `number`.

Corrigir a nullability **vai acusar erros novos no `type-check`**, e essa é a
intenção — cada erro é um consumo de dinheiro nulo sem checagem.

**Dinheiro no banco não está em centavos inteiros:** toda coluna monetária é
`numeric`. Sem corrupção em repouso (`numeric` é decimal exato), mas o PostgREST
serializa como número JSON e o TS recebe `float64`. O §6 quebra na borda, não no
disco. Migrar para centavos é mudança de fórmula: exige golden master antes.
