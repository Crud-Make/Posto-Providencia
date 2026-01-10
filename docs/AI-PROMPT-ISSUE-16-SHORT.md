# Quick AI Prompt: Refactor TelaConfiguracoes.tsx (Issue #16)

## Task
Refactor `src/components/TelaConfiguracoes.tsx` (983 lines) → modular architecture (< 200 lines main file)

## Read Full Spec
`docs/PRD-016-refatoracao-tela-configuracoes.md`

## Create
```
configuracoes/
├── types.ts (8 interfaces)
├── TelaConfiguracoes.tsx (< 200 lines)
├── hooks/ (4 files)
└── components/ (6 files)
```

## Rules
- Zero `any`
- 100% JSDoc (Portuguese)
- Add `// [10/01 17:31]` to all files
- Follow Issue #13 pattern
- Semantic commits

## Steps
1. Create structure + types → commit
2. Create 4 hooks → commit
3. Create 6 components → commit
4. Refactor main file → commit
5. Test build → push

## Validation
- [ ] 13 files created
- [ ] Main < 200 lines
- [ ] Zero `any`
- [ ] Build passes
- [ ] Close Issue #16

**Time:** ~7 hours  
**Branch:** `refactor/tech-debt`

---

**Start:** Read PRD, follow exactly, commit incrementally! 🚀
