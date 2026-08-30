---
name: falsos-positivos-varredura
description: Onde cada check de conformidade produz falso positivo neste repo — comentários que citam a regra, FormaPagamento homônimo, shims de re-export, ../ dentro da própria fatia
metadata:
  type: project
---

Os falsos positivos confirmados até **28/08/2026**, por check. Abrir o arquivo antes
de contar continua sendo a regra; isto só diz onde a armadilha mora.

**§2 "apps/web ↔ apps/pwa-frentista"** — os únicos hits do grep são **comentários
citando a regra**, não imports:
`apps/web/src/services/api/presenca.service.ts:6` e `apps/web/src/utils/periodo.ts:6`
("não pode importar de `apps/web` (§2)"), mais uma citação de doc em
`apps/pwa-frentista/src/App.tsx:369`. As duas regras absolutas do §2 estão
**intactas** — e agora são três apps (`web`, `pwa-frentista`, `pwa-dono`):
```bash
grep -rnE "pwa-frentista|pwa-dono" apps/web/src --include='*.ts' --include='*.tsx'
grep -rn "apps/web" apps/pwa-frentista/src apps/pwa-dono/src --include='*.ts' --include='*.tsx'
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
Vazio = os 4 enums são código morto (reconfirmado 28/08), apesar de o arquivo ser
reexportado por `packages/types/src/database/index.ts:7`.

**§4 `any`** — `apps/web/src/types/database/enums.ts` **não** é enum de TS: é
`interface DatabaseEnums` com union de string, ou seja, já está no padrão. Não
confundir com o arquivo homônimo de `packages/types`.

**§8 import relativo — o alias `@/` EXISTE e funciona.** `apps/web` não tem
`vite.config.ts` nem `tsconfig.json` próprios; quem serve é a config da **raiz**, e
ela declara `'@' → ./apps/web/src` nos dois lados. Então import relativo profundo no
web é escolha do arquivo, não falta de wiring:
```bash
grep -nA8 'alias' vite.config.ts; grep -nA12 '"paths"' tsconfig.json
grep -rl "from '@/" apps/web/src --include='*.ts' --include='*.tsx' | wc -l
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
