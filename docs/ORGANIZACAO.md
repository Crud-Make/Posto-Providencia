# Organização do Projeto - Posto Providência

Para melhorar a clareza e manutenção do projeto, a estrutura de arquivos foi reorganizada. Abaixo estão as principais mudanças realizadas:

## 1. Centralização da Documentação
Todos os arquivos de documentação, relatórios e especificações que estavam na raiz ou na pasta `documentos/` foram movidos para subdiretórios específicos dentro de `docs/`:

- `docs/prd/`: Especificações de Requisitos (PRDs).
- `docs/reports/`: Relatórios de progresso, auditorias e relatórios de sincronização.
- `docs/roadmap/`: Blueprints, roadmaps e status do monorepo.
- `docs/release-notes/`: Changelogs e notas de lançamento.
- `docs/agents/`: Instruções e logs específicos para agentes de IA (anteriormente em `agentes-docs/`).
- `docs/prompts/`: Instruções de sistema e prompts (ex: `claude.md`).
- `docs/data/`: Arquivos de dados brutos e planilhas (ex: `Posto,Jorro, 2025.xlsx`).

## 2. Limpeza da Raiz (Root)
Arquivos temporários e logs soltos foram arquivados ou removidos para manter a raiz focada na configuração do projeto e infraestrutura.

## 3. Consolidação de Tipos (TypeScript)
O arquivo `types.ts` da raiz e a pasta `types/` foram migrados para o pacote `@posto/types` dentro da estrutura do monorepo:

- Localização: `packages/types/src/ui/`
- Novos arquivos:
  - `legacy-types.ts` (anteriormente `types.ts`)
  - `form-types.ts`, `response-types.ts`, `smart-types.ts` (anteriormente em `types/ui/`)
- Todos os tipos agora são exportados via `packages/types/src/index.ts`.

## 4. Estrutura Atualizada (Resumo)
```text
.
├── apps/                # Aplicativos (Web, Mobile, etc.)
├── packages/            # Pacotes compartilhados (Types, Utils, Core)
│   └── types/           # Tipos TypeScript centralizados
├── docs/                # Documentação organizada por categoria
├── supabase/            # Configurações e Migrations do Supabase
├── scripts/             # Scripts de automação
├── .env                 # Configurações de ambiente
└── package.json         # Configuração do Workspace
```
