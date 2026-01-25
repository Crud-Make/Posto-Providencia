# PRD-033: Migração para Monorepo e Refatoração Mobile

## 📋 Visão Geral
Este documento define a transição do ecossistema **Posto Providência** para uma arquitetura de Monorepo utilizando **Bun Workspaces**. O objetivo é centralizar a inteligência do negócio (Tipos, API Core e Utilitários) para que o Web Dashboard e o Mobile App operem em sincronia total, eliminando dívida técnica e bugs de integração.

---

## 🎯 Objetivos
1.  **Sincronia de Tipos**: Garantir que alterações no banco de dados (Supabase) reflitam instantaneamente em ambas as plataformas.
2.  **Eliminação de Dívida Técnica Mobile**: Resolver o erro `RangeError: Maximum call stack size exceeded` no compilador do mobile através da modularização.
3.  **Código Compartilhado**: Centralizar cálculos financeiros e formatadores (R$, datas).
4.  **Padronização de API**: Implementar o padrão `ApiResponse` e `createSuccessResponse` em todos os serviços mobile.
5.  **Performance do Desenvolvedor**: Melhorar o tempo de build e a precisão do IntelliSense no VS Code.

---

## 🏗️ Arquitetura Proposta (Bun Workspaces)

```text
/Posto-Providencia
├── apps/
│   ├── web/               # Dashboard React + Vite (Antigo src/)
│   └── mobile/            # Expo App (Antigo posto-mobile/)
├── packages/
│   ├── types/             # Interface Database, Enums e Smart Types
│   ├── api-core/          # Camada Base do Supabase + Padrão ApiResponse
│   └── utils/             # Formatadores (Currency, Dates) e Cálculos
├── bun.lockb
├── package.json           # Definição de Workspaces
└── turbo.json             # (Opcional) Cache de Build
```

---

## 🛠️ Detalhamento Técnico

### 1. Pacote `@posto/types`
*   **Conteúdo**: Mover `src/types/database/` e `src/types/ui/` do Web para cá.
*   **Uso**: Ambas as apps importam daqui.
*   **Fix Crítico**: Alinhar o `usuario_id` para sempre ser `number` (conforme DB).

### 2. Pacote `@posto/api-core`
*   **Conteúdo**: Implementação base do Supabase Client e tipos de resposta (`ApiResponse`).
*   **Funcionalidade**: Métodos genéricos de `fetch`, `insert`, `update` com tratamento de erro padronizado.

### 3. Refatoração Mobile (Foco Principal)
*   **Arquivo `api.ts`**: Deve ser explodido em serviços menores dentro do mobile ou movido parcialmente para shared.
*   **Arquivo `registro.tsx` (~1100 linhas)**:
    *   Extrair lógica para `useRegistroTurno.ts`.
    *   Dividir UI em `CardEncerrante`, `GridPagamentos`, `ListaNotas`.
*   **Correção de Tipos**: Eliminar o uso excessivo de `any` e `as any` na submissão de fechamentos.

---

## 🚀 Fases de Implementação

### Fase 1: Fundação do Monorepo
1.  Configurar `workspaces` no `package.json` da raiz.
2.  Mover o conteúdo da pasta `src` para `apps/web`.
3.  Mover `posto-mobile` para `apps/mobile`.
4.  Corrigir caminhos de importação relativos e aliases (`@/*`).

### Fase 2: Extração de Pacotes
1.  Criar `packages/types` e configurar o `tsconfig.json`.
2.  Extrair formatadores financeiros para `packages/utils`.
3.  Publicar (localmente via Bun) os pacotes e linkar nas apps.

### Fase 3: Refatoração de Operação (Mobile)
1.  Reformar a comunicação com a API usando os novos tipos compartilhados.
2.  Resolver o erro de stack size do compilador TypeScript.
3.  Aplicar o padrão Clean Component na tela de registro.

---

## ⚠️ Riscos e Mitigações
*   **Risco**: Quebra de roteamento do Expo no monorepo.
*   **Mitigação**: Seguir a documentação oficial do Expo para Monorepos (configurar `metro.config.js` com `watchFolders`).
*   **Risco**: Inconsistência de dependências (React 18 vs 19).
*   **Mitigação**: Padronizar versões compatíveis no `package.json` da raiz usando `resolutions` (se necessário).

---

## ✅ Critérios de Aceite
1.  `bun run build` executado com sucesso em ambas as aplicações.
2.  Zero erros de TypeScript no VS Code.
3.  Alteração em um Tipo no `packages/types` aciona erro de compilação em ambas as `apps` se houver quebra.
4.  App Mobile funcionando em modo universal (seleção de frentista) com tipos estritos.

---

**Prioridade**: 🔴 ALTA
**Responsável**: Agente de Engenharia de Software
**Status**: 📋 Planejado (Aguardando Início)
