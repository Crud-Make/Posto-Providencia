---
name: divida-aceita
description: Violações que o dono já aceitou conscientemente — não relatar como descoberta nova a cada varredura
metadata:
  type: project
---

Estas violações são **estado conhecido e aceito**. Relatá-las como achado novo gasta
a atenção do dono e enterra o que é acionável. Citar o número, dizer que é aceito,
seguir adiante.

**Organização por tipo técnico em `frontend/apps/web/src`** (`components/`, `services/`,
`utils/` em vez das camadas FSD). Está escrito no §2 do CLAUDE.md como estado
conhecido. A reorganização em massa de pasta é **proibida** enquanto houver validação
de dado real em curso — destrói `git blame` onde a auditoria precisa dele. Ordem
correta: consolidar lógica em `frontend/packages/utils` primeiro, mover pastas depois.
**Nunca propor a mudança em massa de pasta.**

**kebab-case (§8) nos nomes de arquivo.** Mais da metade dos arquivos usa
PascalCase/camelCase, herança da organização por tipo técnico. É cosmético e o
`git mv` em massa colide com a proibição acima — a correção só faz sentido junto com
a mudança de pasta, não antes. **Pastas estão 100% em conformidade**; a violação é
só de arquivo. Recontar com:
```bash
find apps packages \( -name '*.ts' -o -name '*.tsx' \) \
  | grep -vE 'node_modules|/dist/|graphify-out|database.types.ts|types/database/generated.ts' \
  | grep -cE '/[^/]*[A-Z_][^/]*\.(ts|tsx)$'
find apps packages -type d | grep -vE 'node_modules|/dist/|graphify-out' | grep -E '/[^/]*[A-Z_][^/]*$'
```

**Import relativo profundo (§8).** É consequência do alias `@/` não estar wired no
`frontend/apps/web` (ver [[falsos-positivos-varredura]]), não de descuido por arquivo. Tratar
como **um** item de dívida com uma causa única, nunca como N achados — listar cada
ocorrência afoga o relatório.

**`as any` em setup de teste.** `(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true`
é idioma de configuração do React Testing Library, não dívida de tipagem de domínio.
Ranquear no fim, se ranquear.
