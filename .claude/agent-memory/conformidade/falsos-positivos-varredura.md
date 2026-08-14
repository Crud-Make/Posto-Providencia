---
name: falsos-positivos-varredura
description: Onde cada check de conformidade produz falso positivo neste repo — comentários que citam a regra, FormaPagamento homônimo, aliases inexistentes
metadata:
  type: project
---

Os falsos positivos confirmados em **12/08/2026**, por check. Abrir o arquivo antes
de contar continua sendo a regra; isto só diz onde a armadilha mora.

**§2 "apps/web ↔ apps/pwa-frentista"** — os únicos hits do grep são **comentários
citando a regra**, não imports:
`apps/web/src/services/api/presenca.service.ts:6` e `apps/web/src/utils/periodo.ts:6`
("não pode importar de `apps/web` (§2)"). As duas regras absolutas do §2 estão
**intactas**; reconfirmar com:
```bash
grep -rnE "pwa-frentista" apps/web/src --include='*.ts' --include='*.tsx'
grep -rnE "from ['\"].*apps/" packages --include='*.ts' --include='*.tsx'
```

**§4 `enum`** — `FormaPagamento` é **homônimo**. Existem três coisas com esse nome:
o `enum` morto em `packages/types/src/database/enums.ts`, um **tipo de tabela** do
Supabase usado em `services/api/formaPagamento.service.ts`, e um tipo de config em
`components/configuracoes/types.ts`. Grep por `FormaPagamento` devolve dezenas de
hits que **não** são uso do enum. O que prova uso de enum é o acesso ao membro:
```bash
grep -rnE '\b(StatusFechamento|TipoEscala|UserRole)\.[A-Z_]+' apps packages --include='*.ts' --include='*.tsx'
```
Vazio = os enums são código morto.

**§4 `any`** — `apps/web/src/types/database/enums.ts` **não** é enum de TS: é
`interface DatabaseEnums` com union de string, ou seja, já está no padrão. Não
confundir com o arquivo homônimo de `packages/types`.

**§8 import relativo** — o alias `@/` está declarado no `tsconfig.json` da raiz mas
**não é usado em nenhum arquivo do `apps/web`**; o `vite.config.ts` do `apps/web`
não declara o alias (só o do `pwa-frentista` declara). Então todo import relativo
profundo do web é consequência da ausência de wiring, não de descuido arquivo a
arquivo. Conferir antes de propor troca:
```bash
grep -rn "from '@/" apps/web/src --include='*.ts' --include='*.tsx' | wc -l   # 0 em 12/08
grep -nA12 '"paths"' tsconfig.json; grep -nA5 'alias' apps/web/vite.config.ts
```

Ver [[divida-aceita]] e [[formula-duplicada-fora-utils]].
