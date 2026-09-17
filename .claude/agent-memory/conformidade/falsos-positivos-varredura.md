---
name: falsos-positivos-varredura
description: Onde cada check de conformidade produz falso positivo neste repo — comentários que citam a regra, FormaPagamento homônimo, shims de re-export, ../ dentro da própria fatia
metadata:
  type: project
---

Os falsos positivos confirmados até **17/09/2026**, por check. Abrir o arquivo antes
de contar continua sendo a regra; isto só diz onde a armadilha mora.

**§2 "frontend/apps/web ↔ frontend/apps/pwa-frentista"** — os únicos hits do grep são **comentários
citando a regra**, não imports:
`frontend/apps/web/src/services/api/presenca.service.ts:6` e `frontend/apps/web/src/utils/periodo.ts:6`
("não pode importar de `frontend/apps/web` (§2)"), mais uma citação de doc em
`frontend/apps/pwa-frentista/src/App.tsx:369`. As duas regras absolutas do §2 estão
**intactas** — e agora são três apps (`web`, `pwa-frentista`, `pwa-dono`):
```bash
grep -rnE "pwa-frentista|pwa-dono" frontend/apps/web/src --include='*.ts' --include='*.tsx'
grep -rn "frontend/apps/web" frontend/apps/pwa-frentista/src frontend/apps/pwa-dono/src --include='*.ts' --include='*.tsx'
grep -rnE "from ['\"].*frontend/apps/" packages --include='*.ts' --include='*.tsx'
```

**§4 `enum`** — em **17/09/2026 o check devolve ZERO**: os 4 enums mortos de
`frontend/packages/types/src/database/enums.ts` (`StatusFechamento`, `TipoEscala`, `UserRole`,
`FormaPagamento`) foram apagados no commit `270c05c`. Se o grep voltar a acusar algo,
lembrar que `FormaPagamento` é **homônimo** (tipo de tabela do Supabase em
`formaPagamento.service.ts` e tipo de config em `components/configuracoes/types.ts`)
e que só o acesso ao membro prova uso de enum:
```bash
grep -rnE '^\s*(export\s+)?(const\s+)?enum ' apps packages --include='*.ts' --include='*.tsx' | grep -vE 'node_modules|/dist/|generated.ts|database.types.ts'
git log --oneline -1 -- frontend/packages/types/src/database/enums.ts   # 270c05c = apagado
```

**§4 `any`** — em 17/09/2026 o check devolve **7 linhas, todas em `*.test.ts`** (5× o idioma `(globalThis as any).IS_REACT_ACT_ENVIRONMENT`, 2× fixture em `useFechamento.test.ts`) — zero em código de produção. Os dois arquivos gerados têm **zero** `any` também. `frontend/apps/web/src/types/database/enums.ts` **não** é enum de TS: é
`interface DatabaseEnums` com union de string, ou seja, já está no padrão. Não
confundir com o arquivo homônimo de `frontend/packages/types`.

**§8 import relativo — o alias `@/` EXISTE e funciona.** `frontend/apps/web` não tem
`vite.config.ts` nem `tsconfig.json` próprios; quem serve é a config da **raiz**, e
ela declara `'@' → ./apps/web/src` nos dois lados. Então import relativo profundo no
web é escolha do arquivo, não falta de wiring:
```bash
grep -nA8 'alias' vite.config.ts; grep -nA12 '"paths"' tsconfig.json
grep -rl "from '@/" frontend/apps/web/src --include='*.ts' --include='*.tsx' | wc -l
```

**§8/§2 `../model/` dentro da própria fatia NÃO é violação.** Numa fatia FSD, `ui/`
importar de `../model/` é a estrutura interna funcionando. O que o §2 proíbe é import
profundo **na fatia alheia** (`@/features/x/model/interno`) — e disso o repo tem
**zero**, porque quase ninguém usa o alias ainda:
```bash
grep -rnE "from '@/(features|entities|widgets|pages|shared)/[^']*/(model|ui|lib|api)/" apps packages --include='*.ts' --include='*.tsx'
```

**Basename duplicado ≠ responsabilidade duplicada.** O check de "dois arquivos com o
mesmo nome" produz três classes de hit e só uma é achado:
- **shim de re-export** (3–4 linhas, `import X from './x/X'; export default X`) —
  `components/TelaGestaoClientes.tsx` e `components/TelaConfiguracoes.tsx` são isso.
  Ponte da migração, não cópia. **Não relatar como duplicação.**
- **homônimo de domínio diferente** — os dois `ListaDespesas.tsx` (financeiro ×
  relatório-diário) e os dois `TabelaLeituras.tsx` (fechamento-diário ×
  leituras-diárias) têm props e conceitos distintos. Unificar é Speculative.
- **`index.ts`/`types.ts`** — 31 e 12 hits, é o idioma de barril do repo.

Ver [[divida-aceita]] e [[formula-duplicada-fora-utils]].
