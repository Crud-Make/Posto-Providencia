# 📁 Documentação Completa para Agente - Refatoração Total

> **Última Atualização:** 11/01/2026
> **Missão:** Completar 100% da refatoração do Posto Providência
> **Status:** 📋 Pronto para Execução

---

## 🎯 INÍCIO RÁPIDO

### Para Agente Novo - Comece Aqui

1. **Leia PRIMEIRO:** [GUIA-EXECUCAO-SEQUENCIAL.md](./GUIA-EXECUCAO-SEQUENCIAL.md)
   - Contém a ordem EXATA de execução
   - 12 componentes em sequência
   - Passo a passo detalhado

2. **EXECUTE AGORA:** [INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md)
   - Instruções para TelaGestaoFinanceira.tsx (próximo componente)
   - Fase 1-7 detalhadas
   - Critérios de aceite

3. **REFERÊNCIA:** [PLANO-MESTRE-REFATORACAO.md](./PLANO-MESTRE-REFATORACAO.md)
   - Visão geral completa
   - Inventário de todos componentes
   - Métricas esperadas

---

## 📂 Arquivos Disponíveis

### 📘 Guias Principais

| Arquivo | Descrição | Quando Usar |
|---------|-----------|-------------|
| **[GUIA-EXECUCAO-SEQUENCIAL.md](./GUIA-EXECUCAO-SEQUENCIAL.md)** | Ordem de execução dos 12 componentes | ⭐ SEMPRE - Guia mestre |
| **[INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md)** | Instruções detalhadas - Sprint 3 | Componente #1 (próximo) |
| **[PLANO-MESTRE-REFATORACAO.md](./PLANO-MESTRE-REFATORACAO.md)** | Inventário completo + métricas | Referência geral |

### 📗 PRDs por Componente (Sprint 3)

| PRD | Componente | Linhas | Tipo | Prioridade | Status |
|-----|------------|--------|------|------------|---------|
| **[PRD-021](./PRD-021-refatoracao-tela-gestao-financeira.md)** | TelaGestaoFinanceira.tsx | 604 | LARGE | 🔴 Alta | ✅ Concluído |

### 📗 PRDs por Componente (Sprint 4 - Dashboards)

| PRD | Componente | Linhas | Tipo | Prioridade | Status |
|-----|------------|--------|------|------------|---------|
| **[PRD-022](./PRD-022-dashboard-proprietario.md)** | TelaDashboardProprietario.tsx | 599 | LARGE | 🔴 Alta | ✅ Concluído |
| **[PRD-023](./PRD-023-gestao-frentistas.md)** | TelaGestaoFrentistas.tsx | 546 | MEDIUM | 🟡 Média | ✅ Concluído |
| **[PRD-024](./PRD-024-analise-vendas.md)** | TelaAnaliseVendas.tsx | 539 | MEDIUM | 🟡 Média | ✅ Concluído |
| **[PRD-025](./PRD-025-gestao-estoque.md)** | TelaGestaoEstoque.tsx | 528 | MEDIUM | 🔴 Alta | ✅ Concluído |
| **[PRD-026](./PRD-026-leituras-diarias.md)** | TelaLeiturasDiarias.tsx | 517 | MEDIUM | 🔴 Alta | ✅ Concluído |
| **[PRD-027](./PRD-027-dashboard-estoque.md)** | TelaDashboardEstoque.tsx | 515 | MEDIUM | 🟡 Média | ✅ Concluído |
| **[PRD-028](./PRD-028-dashboard-vendas.md)** | TelaDashboardVendas.tsx | 509 | MEDIUM | 🟡 Média | ✅ Concluído |

### 📗 PRDs por Componente (Sprint 5 - Finais)

| PRD | Componente | Linhas | Tipo | Prioridade | Status |
|-----|------------|--------|------|------------|---------|
| **[PRD-029](./PRD-029-gestao-despesas.md)** | TelaGestaoDespesas.tsx | 498 | SMALL | 🟢 Baixa | ✅ Concluído |
| **[PRD-030](./PRD-030-relatorio-diario.md)** | TelaRelatorioDiario.tsx | 474 | SMALL | 🟢 Baixa | ✅ Concluído |
| **[PRD-031](./PRD-031-analise-custos.md)** | TelaAnaliseCustos.tsx | 436 | SMALL | 🟢 Baixa | ✅ Concluído |
| **[PRD-032](./PRD-032-fechamento-diario.md)** | TelaFechamentoDiario/index.tsx | 418 | SMALL | 🟢 Baixa | ✅ Concluído |

## 📗 PRDs por Componente (Sprint 6 - Monorepo)

| PRD | Componente | Descrição | Tipo | Prioridade | Status |
|-----|------------|-----------|------|------------|---------|
| **[PRD-033](./PRD-033-MIGRACAO-MONOREPO.md)** | Infraestrutura | Monorepo + Mobile Refactor | LARGE | 🔴 Alta | ⏳ PRÓXIMO |
| **[PRD-034](./PRD-034-REFATORACAO-MOBILE-MONOREPO.md)** | Mobile | Refatoração Senior App Mobile | LARGE | 🔴 CRÍTICA | ⏳ Pendente |

---

## 🚀 Fluxo de Trabalho Recomendado

### Passo 1: Preparação (5 min)
```bash
# 1. Ler guia de execução sequencial
cat agentes-docs/GUIA-EXECUCAO-SEQUENCIAL.md

# 2. Verificar status atual
git status
git log -5 --oneline
```

### Passo 2: Executar Próximo Componente
```bash
# 3. Ler instruções específicas
cat agentes-docs/INSTRUCOES-AGENTE.md

# 4. Ler PRD correspondente
cat agentes-docs/PRD-021-refatoracao-tela-gestao-financeira.md

# 5. Criar branch
git checkout -b refactor/tela-gestao-financeira

# 6. Seguir Fase 1-7 do INSTRUCOES-AGENTE.md
```

### Passo 3: Validação
```bash
# 7. Build
bun run build

# 8. Dev server
bun run dev --port 3015

# 9. Testar em http://localhost:3015
```

### Passo 4: Finalização
```bash
# 10. Commit
git add .
git commit -m "refactor: modulariza TelaGestaoFinanceira (#21)"

# 11. Atualizar CHANGELOG.md
# 12. Push
git push -u origin refactor/tela-gestao-financeira
```

### Passo 5: Próximo Componente
```bash
# 13. Voltar ao GUIA-EXECUCAO-SEQUENCIAL.md
# 14. Executar próximo componente da lista
```

---

## 📊 Progresso Atual

```
Sprint 1 (Types/Services):     ████████████████████ 100% ✅
Sprint 2 (Componentes Crit):   ████████████████████ 100% ✅
Sprint 3 (Componentes Médios): ████████████████████ 100% ✅
Sprint 4 (Dashboards):          ████████████████████ 100% ✅
Sprint 5 (Componentes Finais):  ████████████████████ 100% ✅

Componentes Concluídos: 12/12
Próximo: FASE 4 - MIGRACAO MONOREPO E REFRESH MOBILE 🚀

Total Refatorado: ~16.365 linhas
Total Pendente: ~12.000 linhas (Mobile)
Dívida Técnica: 5% (Foco Mobile)
```

---

## 📋 Checklist Rápido por Componente

Para CADA componente, garantir:

### Código
- [ ] Componente principal <150 linhas
- [ ] Cada hook <150 linhas
- [ ] Cada componente UI <250 linhas
- [ ] Zero uso de `any`
- [ ] JSDoc completo em PORTUGUÊS
- [ ] Tipos TypeScript rigorosos

### Funcionalidade
- [ ] `bun run build` sem erros
- [ ] `bun run dev --port 3015` sem warnings
- [ ] Testes manuais em localhost:3015 OK
- [ ] Zero breaking changes
- [ ] Funcionalidade 100% preservada

### Documentação
- [ ] CHANGELOG.md atualizado
- [ ] Issue criada no GitHub
- [ ] Commit semântico

### Git
- [ ] Branch vinculada à Issue
- [ ] Commits pequenos
- [ ] PR criado (opcional)

---

## 🎯 Ordem de Execução (Resumo)

### Imediato
1. **TelaGestaoFinanceira.tsx** (604 linhas) - Completar Sprint 3

### Sprint 4
2. TelaDashboardProprietario.tsx (599 linhas)
3. TelaLeiturasDiarias.tsx (517 linhas) ⚠️ Reutilizar useLeituras.ts
4. TelaGestaoEstoque.tsx (528 linhas)
5. TelaAnaliseVendas.tsx (539 linhas)
6. TelaGestaoFrentistas.tsx (546 linhas)
7. TelaDashboardEstoque.tsx (515 linhas)
8. TelaDashboardVendas.tsx (509 linhas)

### Sprint 5
9. TelaGestaoDespesas.tsx (498 linhas)
10. TelaRelatorioDiario.tsx (474 linhas) ⚠️ Reutilizar usePagamentos.ts
11. TelaAnaliseCustos.tsx (436 linhas)
12. TelaFechamentoDiario/index.tsx (418 linhas) ⚠️ Reutilizar useFechamento.ts

### Sprint 6 (Monorepo & Mobile)
13. **Migração Monorepo** (Estrutura Bun Workspaces)
14. **Refatoração Mobile** (@posto/types e modularização)
15. **Refatoração RegistroScreen.tsx** (Mobile - 1100 linhas)

---

## ⚠️ AVISOS IMPORTANTES

### Hooks Existentes para Reutilizar

**NÃO DUPLICAR** estes hooks - importar dos arquivos existentes:

| Hook Existente | Onde Está | Reutilizar Em |
|---------------|-----------|---------------|
| `useLeituras.ts` | `src/hooks/useLeituras.ts` (441 linhas) | TelaLeiturasDiarias.tsx |
| `usePagamentos.ts` | `src/hooks/usePagamentos.ts` (163 linhas) | TelaRelatorioDiario.tsx |
| `useFechamento.ts` | `src/hooks/useFechamento.ts` (256 linhas) | TelaFechamentoDiario/index.tsx |

### Regras CRÍTICAS

❌ **PROIBIDO**
- Usar inglês em comentários/strings
- Usar `any` em qualquer lugar
- Criar código sem JSDoc
- Fazer commits grandes
- Pular testes manuais

✅ **OBRIGATÓRIO**
- TODO em Português (Brasil)
- JSDoc em TODOS os arquivos
- Tipos TypeScript rigorosos
- Commits semânticos pequenos
- Testar em localhost:3015

---

## 📚 Referências Essenciais

### Regras do Projeto
- **Arquivo:** `../../CLAUDE.md`
- **Contém:** TODAS as regras de desenvolvimento
- **LEITURA OBRIGATÓRIA** antes de começar

### Exemplos de Padrão (Já Refatorados)

| Padrão | Onde Está | Use Para |
|--------|-----------|----------|
| **Componente Completo** | `../../src/components/registro-compras/` | Componentes complexos |
| **Dashboard** | `../../src/components/ai/strategic-dashboard/` | Dashboards |
| **CRUD** | `../../src/components/clientes/` | Telas de gestão |

---

## 🎉 Resultado Final Esperado

Ao completar TODOS os 12 componentes:

```
✅ Sprint 3: 100% completa
✅ Sprint 4: 100% completa (7 componentes)
✅ Sprint 5: 100% completa (4 componentes)

✅ Total Refatorado: ~16.326 linhas
✅ Dívida Técnica: 0%
✅ Uso de 'any': 0
✅ Documentação: 100%

🎉 PROJETO 100% REFATORADO E PRONTO PARA PRODUÇÃO! ✨
```

---

## 📞 Suporte

Se encontrar dúvidas durante a execução:

1. **Referência Primária:** [GUIA-EXECUCAO-SEQUENCIAL.md](./GUIA-EXECUCAO-SEQUENCIAL.md)
2. **PRD Específico:** Verifique o PRD do componente atual
3. **Exemplos:** Verifique componentes já refatorados
4. **Regras:** Consulte `../../CLAUDE.md`

---

## 🚦 Status de Execução

**Atual:** Sprint 3 (67% completa - 2/3 componentes)
**Próximo:** TelaGestaoFinanceira.tsx
**Tempo Estimado:** 8-12 horas
**Documentação:** ✅ Completa e pronta

---

**BOA SORTE! VOCÊ TEM TUDO QUE PRECISA PARA COMPLETAR A REFATORAÇÃO! 🚀**

**Última Atualização:** 11/01/2026
**Versão da Documentação:** 1.0.0
