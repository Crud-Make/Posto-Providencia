# AI Agent Prompt: Refactor TelaConfiguracoes.tsx

## Context
You are refactoring a React TypeScript component in a gas station management system. The project follows strict `.cursorrules` requiring:
- Zero `any` types
- Complete JSDoc documentation
- Change tracking comments `// [DD/MM HH:mm]`
- Portuguese (PT-BR) documentation
- Semantic commits

## Your Task
Refactor `src/components/TelaConfiguracoes.tsx` (983 lines) into a modular architecture following the pattern established in Issue #13.

## Reference
Read the complete specification: `docs/PRD-016-refatoracao-tela-configuracoes.md`

## Success Criteria
1. Create 13 files in `src/components/configuracoes/`
2. Main component < 200 lines (currently 983)
3. Zero `any` types
4. 100% JSDoc coverage
5. Build passes without errors
6. No breaking changes

## Architecture
```
configuracoes/
├── types.ts (8 interfaces with JSDoc)
├── TelaConfiguracoes.tsx (< 200 lines)
├── hooks/ (4 custom hooks)
│   ├── useConfiguracoesData.ts
│   ├── useFormaPagamento.ts
│   ├── useParametros.ts
│   └── useResetSistema.ts
└── components/ (6 UI components)
    ├── GestaoProdutos.tsx
    ├── GestaoBicos.tsx
    ├── GestaoFormasPagamento.tsx
    ├── ParametrosFechamento.tsx
    ├── ParametrosEstoque.tsx
    └── ModalResetSistema.tsx
```

## Implementation Steps

### Phase 1: Setup (30 min)
1. Create folder structure
2. Create `types.ts` with all interfaces
3. Add JSDoc to all types
4. Commit: `refactor(config): cria estrutura e tipos (#16)`

### Phase 2: Hooks (2 hours)
1. Create 4 hooks following PRD specs
2. Add complete JSDoc
3. Eliminate all `any` types
4. Commit: `refactor(config): adiciona hooks customizados (#16)`

### Phase 3: Components (3 hours)
1. Create 6 UI components
2. Extract JSX from original file
3. Add JSDoc to all components
4. Commit: `refactor(config): adiciona componentes de UI (#16)`

### Phase 4: Integration (1 hour)
1. Refactor main `TelaConfiguracoes.tsx`
2. Create `index.ts` barrel export
3. Verify build passes
4. Commit: `refactor(config): integra componentes e hooks (#16)`

### Phase 5: Finalization (30 min)
1. Test all functionality
2. Verify `.cursorrules` compliance
3. Push to branch `refactor/tech-debt`
4. Close Issue #16

## Key Requirements

### TypeScript Strict
- Replace all `any` with proper types
- Use `PaymentType` union type for payment methods
- Type all callbacks and handlers
- No type assertions without justification

### JSDoc Format
```typescript
/**
 * Brief description in Portuguese
 * 
 * @param {Type} paramName - Description in Portuguese
 * @returns {ReturnType} Description in Portuguese
 * 
 * @example
 * ```tsx
 * <Component prop={value} />
 * ```
 */
```

### Change Tracking
Add to every file:
```typescript
// [10/01 17:30] Created during Issue #16 refactoring
```

### Git Workflow
```bash
git checkout refactor/tech-debt
git add <files>
git commit -m "refactor(config): <message> (#16)"
git push origin refactor/tech-debt
```

## Important Notes

1. **Preserve Logic**: Don't change business logic, only structure
2. **Reference Issue #13**: Follow the exact same pattern
3. **Test Incrementally**: Build after each phase
4. **No Shortcuts**: Complete JSDoc is mandatory
5. **Portuguese Docs**: All comments and JSDoc in PT-BR

## Validation Checklist
- [ ] 13 files created
- [ ] Main file < 200 lines
- [ ] Zero `any` types
- [ ] 100% JSDoc coverage
- [ ] All files have tracking comments
- [ ] `npm run build` passes
- [ ] No functionality broken
- [ ] Semantic commits made
- [ ] Branch pushed
- [ ] Issue #16 closed

## Resources
- Full specification: `docs/PRD-016-refatoracao-tela-configuracoes.md`
- Reference implementation: Issue #13 commits
- Project rules: `.cursorrules`
- Original file: `src/components/TelaConfiguracoes.tsx`

## Estimated Time
7 hours total

## Start Command
```bash
cd c:\Users\Thiago\Documents\Posto-Providencia
git checkout refactor/tech-debt
code docs/PRD-016-refatoracao-tela-configuracoes.md
```

---

**Good luck! Follow the PRD exactly and you'll succeed! 🚀**
