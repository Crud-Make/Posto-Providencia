# 🚀 GUIA DE EXECUÇÃO SEQUENCIAL - Refatoração Completa

> **Data:** 11/01/2026
> **Propósito:** Instruções passo a passo para o agente executar TODAS as refatorações
> **Ordem:** Priorizada por impacto e dependências

---

## 📋 VISÃO GERAL

Este guia contém a sequência EXATA de execução para completar 100% da refatoração do projeto.

**Total de Componentes:** 12
**Total de Linhas:** ~7.500 linhas
**Tempo Total Estimado:** 74-98 horas (~12-16 dias úteis)

---

## 🎯 FASE 1: SPRINT 3 FINAL (1 componente)

### Componente #1: TelaGestaoFinanceira.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🔴 CRÍTICA
**Linhas:** 604 → ~115 (redução de 81%)
**Tempo:** 8-12 horas

#### Documentação Completa
- **PRD:** [PRD-021-refatoracao-tela-gestao-financeira.md](./PRD-021-refatoracao-tela-gestao-financeira.md)
- **Instruções:** [INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md)

#### Passo a Passo
1. Ler [INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md) completamente
2. Executar Fase 1-7 conforme documentado
3. Validar em localhost:3015
4. Criar commit seguindo padrão
5. Atualizar CHANGELOG.md
6. **Resultado:** Sprint 3 = 100% ✅

#### Após Conclusão
```bash
# Verificar conclusão
✅ Sprint 3: 100% completa
✅ Dívida Técnica: ~15% restante
✅ Total Refatorado: ~10.747 linhas

# Próximo passo
Iniciar FASE 2 (Sprint 4)
```

---

## 🎯 FASE 2: SPRINT 4 - DASHBOARDS E GESTÃO (7 componentes)

### Componente #2: TelaDashboardProprietario.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🔴 Alta (Dashboard crítico para gestão)
**Linhas:** 599 → ~100
**Tempo:** 8-10 horas
**PRD:** [PRD-022-dashboard-proprietario.md](./PRD-022-dashboard-proprietario.md)

#### Estrutura a Criar
```
src/components/dashboard-proprietario/
├── TelaDashboardProprietario.tsx     # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (3 arquivos)
```

#### Passos
1. Criar branch: `git checkout -b refactor/dashboard-proprietario`
2. Criar estrutura de pastas
3. Implementar hooks (3 arquivos)
4. Implementar componentes (4 arquivos)
5. Integrar no componente principal
6. Testar em localhost:3015
7. Commit + atualizar CHANGELOG.md
8. Criar Issue no GitHub
9. Push e PR

#### Critérios de Aceite Específicos
- [ ] Gráficos renderizam (Recharts)
- [ ] Métricas calculadas corretamente
- [ ] Alertas funcionam
- [ ] Filtros de período funcionam
- [ ] Responsivo

---

### Componente #3: TelaLeiturasDiarias.tsx

**Prioridade:** 🔴 Alta (Operação diária essencial)
**Linhas:** 517 → ~100
**Tempo:** 7-9 horas
**PRD:** [PRD-026-leituras-diarias.md](./PRD-026-leituras-diarias.md)

#### ⚠️ IMPORTANTE
**REUTILIZAR hook existente:** `src/hooks/useLeituras.ts` (441 linhas)
Não duplicar código! Este hook já contém toda a lógica de leituras.

#### Estrutura a Criar
```
src/components/leituras-diarias/
├── TelaLeiturasDiarias.tsx           # ~100 linhas
├── components/ (4 arquivos)
└── hooks/
    ├── useLeituras.ts                # ⚠️ IMPORTAR do existente
    ├── useValidacoes.ts              # Novo
    └── useCalculosLitros.ts          # Novo
```

#### Passos
1. Branch: `git checkout -b refactor/leituras-diarias`
2. **Importar** useLeituras.ts existente (não duplicar)
3. Criar useValidacoes.ts
4. Criar useCalculosLitros.ts
5. Criar componentes UI (4 arquivos)
6. Integrar
7. Testar validações (leitura atual > anterior)
8. Testar cálculo de litros (3 decimais)
9. Commit + CHANGELOG.md

---

### Componente #4: TelaGestaoEstoque.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🔴 Alta (Controle de estoque crítico)
**Linhas:** 528 → ~100
**Tempo:** 7-9 horas
**PRD:** [PRD-025-gestao-estoque.md](./PRD-025-gestao-estoque.md)

#### Estrutura a Criar
```
src/components/estoque/
├── TelaGestaoEstoque.tsx             # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (3 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/gestao-estoque`
2. Implementar hooks (useEstoque, useMovimentacoes, useAlertas)
3. Implementar componentes (Tabela, Form, Card, Histórico)
4. Testar movimentações (entrada/saída/ajuste)
5. Testar alertas de estoque baixo
6. Validar sincronização com tanques
7. Commit + CHANGELOG.md

---

### Componente #5: TelaAnaliseVendas.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟡 Média
**Linhas:** 539 → ~100
**Tempo:** 7-9 horas
**PRD:** [PRD-024-analise-vendas.md](./PRD-024-analise-vendas.md)

#### Estrutura a Criar
```
src/components/analise-vendas/
├── TelaAnaliseVendas.tsx             # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (3 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/analise-vendas`
2. Implementar filtros avançados
3. Criar gráficos (linha, barras, pizza)
4. Implementar tabela com drill-down
5. Implementar exportação (Excel/PDF/CSV)
6. Testar comparativos de período
7. Commit + CHANGELOG.md

---

### Componente #6: TelaGestaoFrentistas.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟡 Média
**Linhas:** 546 → ~160
**Tempo:** 7-9 horas
**PRD:** [PRD-023-gestao-frentistas.md](./PRD-023-gestao-frentistas.md)

#### Estrutura a Criar
```
src/components/frentistas/
├── TelaGestaoFrentistas.tsx          # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (3 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/gestao-frentistas`
2. Implementar CRUD de frentistas
3. Implementar gestão de escalas
4. Implementar métricas de desempenho
5. Testar validações (CPF, telefone)
6. Testar máscaras
7. Commit + CHANGELOG.md

---

### Componente #7: TelaDashboardEstoque.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟡 Média
**Linhas:** 515 → ~100
**Tempo:** 6-8 horas
**PRD:** [PRD-027-dashboard-estoque.md](./PRD-027-dashboard-estoque.md)

#### Estrutura a Criar
```
src/components/dashboard-estoque/
├── TelaDashboardEstoque.tsx          # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (3 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/dashboard-estoque`
2. Implementar previsões de ruptura
3. Criar gráficos de nível
4. Implementar análise de giro
5. Testar alertas críticos
6. Commit + CHANGELOG.md

---

### Componente #8: TelaDashboardVendas.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟡 Média
**Linhas:** 509 → ~130
**Tempo:** 6-8 horas
**PRD:** [PRD-028-dashboard-vendas.md](./PRD-028-dashboard-vendas.md)

#### Estrutura a Criar
```
src/components/dashboard-vendas/
├── TelaDashboardVendas.tsx           # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (3 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/dashboard-vendas`
2. Implementar rankings (top 10)
3. Criar gráficos de tendência
4. Implementar comparativos
5. Testar KPIs
6. Commit + CHANGELOG.md

#### Após Conclusão da Fase 2
```bash
# Verificar conclusão Sprint 4
✅ Sprint 4: 100% completa (7 componentes)
✅ Dívida Técnica: ~5% restante
✅ Total Refatorado: ~14.500 linhas

# Próximo passo
Iniciar FASE 3 (Sprint 5 - Componentes Finais)
```

---

## 🎯 FASE 3: SPRINT 5 - COMPONENTES FINAIS (4 componentes)

### Componente #9: TelaGestaoDespesas.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟢 Baixa
**Linhas:** 498 → ~100
**Tempo:** 5-7 horas
**PRD:** [PRD-029-gestao-despesas.md](./PRD-029-gestao-despesas.md)

#### Estrutura a Criar
```
src/components/despesas/
├── TelaGestaoDespesas.tsx            # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (3 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/gestao-despesas`
2. Implementar CRUD de despesas
3. Implementar gestão de categorias
4. Criar gráfico por categoria (pizza)
5. Implementar comparativo mensal
6. Testar upload de comprovantes
7. Commit + CHANGELOG.md

---

### Componente #10: TelaRelatorioDiario.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟢 Baixa
**Linhas:** 474 → ~100
**Tempo:** 5-6 horas
**PRD:** [PRD-030-relatorio-diario.md](./PRD-030-relatorio-diario.md)

#### ⚠️ IMPORTANTE
**REUTILIZAR hook existente:** `src/hooks/usePagamentos.ts` (163 linhas)

#### Estrutura a Criar
```
src/components/relatorio-diario/
├── TelaRelatorioDiario.tsx           # ~100 linhas
├── components/ (4 arquivos)
└── hooks/ (2 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/relatorio-diario`
2. Implementar consolidação de dados
3. Criar seções (Vendas, Despesas, Estoque)
4. Implementar exportação PDF
5. Implementar exportação Excel
6. Testar geração de relatórios
7. Commit + CHANGELOG.md

---

### Componente #11: TelaAnaliseCustos.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟢 Baixa
**Linhas:** 436 → ~100
**Tempo:** 4-6 horas
**PRD:** [PRD-031-analise-custos.md](./PRD-031-analise-custos.md)

#### Estrutura a Criar
```
src/components/analise-custos/
├── TelaAnaliseCustos.tsx             # ~100 linhas
├── components/ (3 arquivos)
└── hooks/ (2 arquivos)
```

#### Passos
1. Branch: `git checkout -b refactor/analise-custos`
2. Implementar cálculos de margem
3. Criar gráfico de margens
4. Implementar comparativo de fornecedores
5. Testar cálculos (margem bruta, líquida, markup)
6. Commit + CHANGELOG.md

---

### Componente #12: TelaFechamentoDiario/index.tsx

**Status:** ✅ CONCLUÍDO
**Prioridade:** 🟢 Baixa (MAS MAIS FÁCIL)
**Linhas:** 418 → ~100
**Tempo:** 4-5 horas
**PRD:** [PRD-032-fechamento-diario.md](./PRD-032-fechamento-diario.md)

#### ⚠️ IMPORTANTE
**REUTILIZAR hook existente:** `src/hooks/useFechamento.ts` (256 linhas)
Este é o componente MAIS SIMPLES - já tem hook robusto pronto!

#### Estrutura a Criar
```
src/components/fechamento-diario/
├── index.tsx                         # ~100 linhas
├── components/ (3 arquivos)
└── hooks/
    ├── useFechamento.ts              # ⚠️ IMPORTAR do existente
    └── useValidacoesFechamento.ts    # Novo
```

#### Passos
1. Branch: `git checkout -b refactor/fechamento-diario`
2. **Importar** useFechamento.ts existente
3. Criar useValidacoesFechamento.ts
4. Criar componentes UI (3 arquivos)
5. Testar validações
6. Testar cálculo de diferenças
7. Commit + CHANGELOG.md

#### Após Conclusão da Fase 3
```bash
# Verificar conclusão Sprint 5
✅ Sprint 5: 100% completa (4 componentes)
✅ Dívida Técnica: 0% 🎉
✅ Total Refatorado: ~16.365 linhas

# PROJETO 100% REFATORADO! ✨
```

---

## 🎉 FASE 4: FINALIZAÇÃO E CELEBRAÇÃO

### Passo 1: Validação Final
```bash
# Build de produção
bun run build

# Verificar sem erros
✅ Build sem erros
✅ Zero warnings de TypeScript
✅ Zero uso de 'any'
```

### Passo 2: Atualizar Documentação Final
```bash
# Atualizar docs/Visão geral.md
- Marcar 100% de refatoração concluída
- Atualizar métricas finais
- Documentar conquistas

# Atualizar CHANGELOG.md
- Seção: [v3.0.0] - Refatoração Completa
- Listar TODOS os componentes refatorados
- Métricas finais
```

### Passo 3: Criar Release Tag
```bash
git tag -a v3.0.0 -m "Refatoração completa - Zero dívida técnica"
git push origin v3.0.0
```

### Passo 4: PR Final (Opcional)
```bash
# Criar PR épico consolidando tudo
gh pr create --title "🎉 Refatoração Completa - 100% do Projeto Modularizado" \
  --body "
## 🎯 Resumo

Refatoração completa de TODOS os componentes grandes do projeto.

## 📊 Métricas Finais

- **Total Refatorado:** ~16.326 linhas
- **Componentes Modularizados:** 15 componentes
- **Redução Média:** ~85% de linhas por arquivo
- **Dívida Técnica:** 0%
- **Uso de 'any':** 0
- **Documentação:** 100%

## ✅ Sprints Concluídas

- Sprint 1 (Types/Services): ✅ 100%
- Sprint 2 (Componentes Críticos): ✅ 100%
- Sprint 3 (Componentes Médios): ✅ 100%
- Sprint 4 (Dashboards): ✅ 100%
- Sprint 5 (Componentes Finais): ✅ 100%

## 🚀 Resultado

Projeto totalmente modular, manutenível e escalável.
Pronto para produção de longo prazo.

Closes #21, #22, #23, #24, #25, #26, #27, #28, #29, #30, #31, #32
"
```

---

## 📊 CHECKLIST GLOBAL DE PROGRESSO

Use este checklist para acompanhar o progresso:

### Sprint 3 Final
- [x] #1 - TelaGestaoFinanceira.tsx (604 linhas)

### Sprint 4 - Dashboards e Gestão
- [x] #2 - TelaDashboardProprietario.tsx (599 linhas)
- [x] #3 - TelaLeiturasDiarias.tsx (517 linhas)
- [x] #4 - TelaGestaoEstoque.tsx (528 linhas)
- [x] #5 - TelaAnaliseVendas.tsx (539 linhas)
- [x] #6 - TelaGestaoFrentistas.tsx (546 linhas)
- [x] #7 - TelaDashboardEstoque.tsx (515 linhas)
- [x] #8 - TelaDashboardVendas.tsx (509 linhas)

### Sprint 5 - Componentes Finais
- [x] #9 - TelaGestaoDespesas.tsx (498 linhas)
- [x] #10 - TelaRelatorioDiario.tsx (474 linhas)
- [x] #11 - TelaAnaliseCustos.tsx (436 linhas)
- [x] #12 - TelaFechamentoDiario/index.tsx (418 linhas)

### Finalização
- [ ] Build de produção sem erros
- [ ] Documentação atualizada
- [ ] CHANGELOG.md completo
- [ ] Release tag v3.0.0
- [ ] PR final criado
- [ ] Celebração! 🎉

---

## ⚠️ REGRAS CRÍTICAS PARA TODAS AS FASES

### Para CADA Componente

#### Antes de Começar
1. Criar branch vinculada à Issue
2. Ler PRD específico completamente
3. Verificar hooks existentes para reutilizar

#### Durante Implementação
1. JSDoc em PORTUGUÊS em tudo
2. Zero uso de `any`
3. Tipos TypeScript rigorosos
4. Commits pequenos e semânticos

#### Antes de Finalizar
1. `bun run build` sem erros
2. `bun run dev --port 3015` sem warnings
3. Testar TODAS as funcionalidades em localhost:3015
4. Atualizar CHANGELOG.md
5. Criar/fechar Issue no GitHub

---

## 📈 MÉTRICAS ESPERADAS POR FASE

| Fase | Componentes | Linhas | Tempo | Dívida Técnica |
|------|-------------|--------|-------|----------------|
| Atual | 0 | 10.143 | - | ~35% |
| Fase 1 | 1 | 10.747 | 8-12h | ~15% |
| Fase 2 | 7 | 14.500 | 48-61h | ~5% |
| Fase 3 | 4 | 16.326 | 18-24h | 0% ✨ |

---

## 🎯 PRÓXIMO PASSO IMEDIATO

**AGORA:** Executar [INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md)
**Componente:** TelaGestaoFinanceira.tsx
**Resultado:** Sprint 3 = 100% ✅

Após conclusão, retornar a este guia para iniciar Componente #2.

---

**BOA SORTE! VOCÊ VAI COMPLETAR A REFATORAÇÃO! 🚀**

**Status:** 📋 Pronto para Execução Sequencial
**Início:** TelaGestaoFinanceira.tsx (Sprint 3)
**Conclusão Prevista:** ~12-16 dias úteis
**Última Atualização:** 11/01/2026
