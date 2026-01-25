---
title: Plano de Refatoração Senior do App Mobile (PRD-034)
status: pending
generated: 2026-01-25
agents:
  - type: "backend-specialist"
    role: "Responsável pela migração da camada de serviços e tipagem"
  - type: "frontend-specialist"
    role: "Responsável pela modularização da UI e hooks"
  - type: "architect-specialist"
    role: "Garante a adesão aos padrões de design e monorepo"
---

# 📋 Refactor Mobile Senior Plan

## 🎯 Goals and Scope

Refatoração completa do aplicativo mobile (`apps/mobile`) para eliminar dívida técnica crítica, padronizar tipos e modularizar arquivos gigantes.

- **Eliminar 100% das ocorrências de `any`** em arquivos TS/TSX.
- **Modularizar `lib/api.ts`** (941 linhas) em serviços especializados.
- **Refatorar `app/(tabs)/registro.tsx`** (1.176 linhas) extraindo lógica para hooks e subcomponentes.
- **Sincronizar tipos** com o pacote `@posto/types` do monorepo.

## 🏗️ Execution Phases

### Phase 1: Estabilização e Tipagem (P/R)
- **Goal**: Mapear dívida técnica e preparar infraestrutura de tipos.
- **Steps**:
  1. Identificar todos os 13+ usos de `any` via `grep`.
  2. Verificar se `@posto/types` (packages/types) atende a todas as necessidades do mobile.
  3. Criar a estrutura de diretórios em `apps/mobile/lib/services`.
- **Deliverables**: Lista de arquivos para correção de tipagem, estrutura de pastas pronta.
- **Checkpoint**: `git commit -m "chore(mobile): preparando estrutura de serviços e mapeando any"`

### Phase 2: Refatoração da Camada de Serviços (E)
- **Goal**: Desmembrar o monolito `api.ts`.
- **Steps**:
  1. Criar `posto.service.ts`, `frentista.service.ts`, `turno.service.ts`, etc.
  2. Migrar funções de `api.ts` para os novos serviços, tipando retornos com `Promise<ApiResponse<T>>`.
  3. Substituir importações de `api.ts` por `lib/services`.
  4. Remover `api.ts` após migração total.
- **Deliverables**: 8+ novos arquivos de serviço em `apps/mobile/lib/services`.
- **Checkpoint**: `git commit -m "refactor(mobile): modulariza api.ts em serviços especializados"`

### Phase 3: Modularização do Registro de Turno (E)
- **Goal**: Quebrar o componente "God Object" `registro.tsx`.
- **Steps**:
  1. Extrair lógica de estado para `hooks/useRegistroForm.ts`.
  2. Extrair busca de dados para `hooks/useRegistroData.ts`.
  3. Extrair submissão para `hooks/useRegistroSubmit.ts`.
  4. Criar componentes UI isolados (`FormaPagamentoGrid`, `NotasList`, `ResumoCaixa`, `HeaderRegistro`).
  5. Simplificar `index.tsx` para < 400 linhas.
- **Deliverables**: Pasta `apps/mobile/app/(tabs)/registro/` com estrutura modular.
- **Checkpoint**: `git commit -m "refactor(mobile): modulariza registro.tsx e extrai hooks"`

### Phase 4: Validação e Documentação (V/C)
- **Goal**: Garantir qualidade e compliance com CLAUDE.md.
- **Steps**:
  1. Executar `type-check` em todo o apps/mobile.
  2. Validar submissão de fechamento no app real/simulador.
  3. Atualizar documentation em `.context/docs` e `docs/agents`.
- **Deliverables**: Build sem erros, documentação atualizada.
- **Checkpoint**: `git commit -m "docs(mobile): finaliza refatoração senior do app mobile"`

## 👨‍💻 Agent Lineup
- **architect-specialist**: Define a estrutura de serviços e contratos de tipos.
- **frontend-specialist**: Realiza a quebra de componentes e implementação de hooks.
- **documentation-writer**: Mantém o PRD e o CHANGELOG atualizados.

## 📚 Documentation Touchpoints
- Atualizar `.context/docs/architecture.md` com a nova estrutura de serviços mobile.
- Atualizar `apps/mobile/README.md`.
- Registrar mudanças no `CHANGELOG.md` da raiz.

## ✅ Success Criteria
- [ ] **Zero `any`** em todo o diretório `apps/mobile`.
- [ ] `registro.tsx` com menos de 400 linhas de código.
- [ ] Todos os serviços exportados centralizadamente via `lib/services/index.ts`.
- [ ] App mobile totalmente funcional integrado ao monorepo.
- [ ] `bun run build` executado com sucesso na raiz.

## 🔄 Rollback Plan
- Caso ocorram bugs críticos de tipagem ou regressões funcionais:
  1. Reverter para a branch `main`.
  2. Analisar logs do Supabase para conferir se os contratos de API foram mantidos.
