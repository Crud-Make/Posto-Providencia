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

**§8 import relativo** — **corrigido em 16/08/2026.** A entrada anterior dizia que o
alias `@/` não estava wired e que `apps/web/vite.config.ts` não o declarava. As duas
coisas estavam erradas: **`apps/web` não tem `vite.config.ts` nem `tsconfig.json`
próprios** (só `.env` e `index.html` na raiz do app). Quem serve o web é a config da
**raiz do repo**, e ela declara o alias nos dois lados — `vite.config.ts` com
`'@' → ./apps/web/src` e `tsconfig.json` com `"@/*"`. Código novo já usa `@/`.
Então import relativo profundo no web é escolha do arquivo, não falta de wiring:
```bash
ls apps/web/vite.config.* apps/web/tsconfig*.json 2>&1   # não existem — é a raiz
grep -nA8 'alias' vite.config.ts; grep -nA12 '"paths"' tsconfig.json
grep -rl "from '@/" apps/web/src --include='*.ts' --include='*.tsx' | wc -l
```

**§8/§2 `../model/` dentro da própria fatia NÃO é violação.** Numa fatia FSD, `ui/`
importar de `../model/` é a estrutura interna funcionando. O que o §2 proíbe é import
profundo **na fatia alheia** (`@/features/x/model/interno`). Contar os `../` de dentro
da fatia como dívida infla o relatório com o padrão correto:
```bash
grep -rn "from '\.\./\.\./" apps packages --include='*.ts' --include='*.tsx'  # este é o hit real
```

Ver [[divida-aceita]] e [[formula-duplicada-fora-utils]].
