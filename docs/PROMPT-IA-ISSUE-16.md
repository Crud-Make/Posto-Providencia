# Prompt Rápido IA: Refatorar TelaConfiguracoes.tsx (Issue #16)

## Tarefa
Refatorar `src/components/TelaConfiguracoes.tsx` (983 linhas) → arquitetura modular (< 200 linhas no arquivo principal)

## Leia a Especificação Completa
`docs/PRD-016-refatoracao-tela-configuracoes.md`

## Criar
```
configuracoes/
├── types.ts (8 interfaces)
├── TelaConfiguracoes.tsx (< 200 linhas)
├── hooks/ (4 arquivos)
└── components/ (6 arquivos)
```

## Regras Obrigatórias
- Zero `any`
- 100% JSDoc (em português)
- Adicionar `// [10/01 17:45]` em todos os arquivos
- Seguir padrão da Issue #13
- Commits semânticos

## Passos
1. Criar estrutura + types → commit
2. Criar 4 hooks → commit
3. Criar 6 componentes → commit
4. Refatorar arquivo principal → commit
5. Testar build → push

## Validação
- [ ] 13 arquivos criados
- [ ] Principal < 200 linhas
- [ ] Zero `any`
- [ ] Build passa
- [ ] Fechar Issue #16

**Tempo:** ~7 horas  
**Branch:** `refactor/tech-debt`

---

**Comece:** Leia o PRD, siga exatamente, faça commits incrementais! 🚀
