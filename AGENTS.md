# AGENTS.md

## Dev Environment & Build Commands
- Install dependencies: `npm install`
- Development server: `npm run dev` (Vite on port 3015)
- Production build: `npm run build`
- Run linter: `npm run lint`
- Type checking: `npm run type-check`
- Run all tests: `npm run test`
- Run single test: `npx vitest run <caminho/do/arquivo.test.ts>`
- Run tests in watch mode: `npx vitest`
- Preview production build: `npm run preview`

## Code Style Guidelines

### Imports
- External imports first (React, third-party libs)
- Relative imports second (components, hooks, services)
- Workspace imports (@posto/*) after externals
- Optional: alphabetize within each group
- No .ts/.tsx extensions in internal imports
- Example:
  ```ts
  import React from 'react';
  import { createClient } from '@supabase/supabase-js';
  import type { Database } from '../types/database';
  ```

### Naming Conventions
- Components: PascalCase (TelaDashboard, KPICard)
- Hooks: camelCase with "use" prefix (useDashboard, useFrentistas)
- Variables/Constants: camelCase (loading, data, selectedDate)
- Interfaces/Types: PascalCase (DashboardKpis, FuelData)
- Services: camelCase (supabase, handleSupabaseError, fetchDashboardData)
- Component files: PascalCase (TelaDashboard.tsx)
- Util/service files: kebab-case (formatters.ts, supabase.ts)
- Test files: *.test.ts (not *.spec.ts)

### Types & TypeScript
- TypeScript strict: Use types, ZERO `any`
- Interfaces for complex structures, types for simple ones
- Optional fields use `| null` (not `| undefined`)
- Supabase queries use `Database<TableType>` for type safety
- Generics for reusable functions: `function parseValue<T>(value: T)`

### JSDoc (MANDATORY)
- JSDoc required on ALL functions, components, and modules
- @param, @returns, @module tags required
- For code changes, insert above modified line: `// [DD/MM HH:mm] O que mudou/Porquê`
- Use @remarks for additional context
- Example:
  ```ts
  /**
   * Hook de dados do Dashboard
   * @module useDashboard
   * @remarks Centraliza carregamento/estado de filtros
   */
  ```

### Error Handling
- Use `handleSupabaseError(error, operacao)` for Supabase errors
- Try-catch all async operations
- Console.error for logging
- Throw errors for upstream handling
- Use `ApiResponse<T>` type for service responses
- Use `isSuccess(response)` helper to check responses

### Component Structure
- Functional components with React Hooks
- Extract business logic to custom hooks
- Use Context for global state (AuthContext, PostoContext)
- Refs for DOM elements and click-outside handling
- Props interface above component
- Early returns for loading/error states

### Formatting
- 4-space indentation
- Arrow functions preferred
- Destructure objects when possible
- Section comments: `// Filter state`, `// Load data`, etc.
- Tailwind CSS for styling (web), NativeWind (mobile)

## Testing
- Framework: Vitest with jsdom environment
- Use `describe` and `it` blocks (available globally)
- Test files must end in `.test.ts`
- Structure: `describe('feature', () => { it('should...', () => {}) })`
- Imports: `import { describe, it, expect } from 'vitest'`

## Quality Standards (REGRAS ZERO)
- Clean Code: SOLID/DRY principles mandatory
- Simplicity > Complexity - minimum code to solve problem
- Interfaces before implementation
- Create feature branches for all changes
- Semantic commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- One logical change = one commit
- NEVER work directly on main/master
- NO `git push --force` - blocked
- Validate with user before merge/push to remote

## Repository Map
- `apps/web/` - React web dashboard (Vite, React Router)
- `apps/mobile/` - Expo/React Native app with NativeWind
- `packages/types/` - Shared TypeScript types (Database, UI types)
- `packages/utils/` - Shared utilities (formatters, calculators)
- `packages/api-core/` - Core API services and base utilities
- `apps/web/src/components/` - Feature components organized by domain
- `apps/web/src/services/api/` - Supabase service layer (nome.entity.service.ts)
- `apps/web/src/types/database/tables/` - Database table type definitions
- `.context/` - Store generated artifacts for deterministic reruns

## Git Workflow (Mobile Specific)
- Branch obrigatória para cada mudança
- Fluxo: Criar Branch → Implementar → Solicitar teste do usuário → Merge (após OK) → Push
- Nenhum agente AI pode fazer merge/push sem aprovação do usuário
- Limpar branches após merge para main

## Agentes Especializados
- **Documentação**: `.context/agents/README.md` - Playbooks para agentes especializados
- **PRDs e Guias**: `docs/agents/` - Documentação de funcionalidades e guias de execução
- **Feature Developer**: `.context/agents/feature-developer.md` - Implementação de novas funcionalidades

## Architecture Patterns
- **Layers**: Controllers → Services → Components → Models
- **API Responses**: Use `ApiResponse<T>`, `SuccessResponse`, `ErrorResponse`
- **Helpers**: `createSuccessResponse`, `createErrorResponse`, `isSuccessResponse`, `isErrorResponse`
- **Shared Packages**: @posto/types, @posto/utils, @posto/api-core (workspace packages)
- **Service Pattern**: Stateless functions, typed inputs, wrapped responses

## Hooks for Reuse
- `useLeituras.ts` - Leitura de bombas (apps/web/src/hooks/)
- `usePagamentos.ts` - Pagamentos (apps/web/src/hooks/)
- `useFechamento.ts` - Fechamento diário (apps/web/src/hooks/)

## Key Domain Types
- `Turno` - Shift management
- `Frentista` - Pump attendants
- `Fechamento` - Daily closings
- `VendaProduto` - Product sales
- `Cliente` - Customer management
- `SubmitClosingData` - Closing submission input
- `ApiResponse<T>` - Standard API response wrapper
## AI Context References
- Documentation index: `.context/docs/README.md`
- Agent playbooks: `.context/agents/README.md`

