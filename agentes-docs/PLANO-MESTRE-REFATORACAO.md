# 📋 PLANO MESTRE - Refatoração Completa do Projeto

> **Data:** 11/01/2026
> **Objetivo:** Completar 100% da refatoração do Posto Providência
> **Status Atual:** Sprint 3 em 67% | Dívida Técnica Restante: ~35%

---

## 🎯 VISÃO GERAL

### Progresso Global

```
Sprint 1 (Types/Services):     ████████████████████ 100% ✅
Sprint 2 (Componentes Crit):   ████████████████████ 100% ✅
Sprint 3 (Componentes Médios): ████████████████░░░░  67% 🔄
Sprint 4 (Componentes Finais): ░░░░░░░░░░░░░░░░░░░░   0% ⏳

Total Refatorado: 10.143 linhas
Total Pendente: ~7.500 linhas
```

### O que já foi feito (Resumo)

| Sprint | Issues | Linhas Refatoradas | Status |
|--------|--------|-------------------|---------|
| Sprint 1 | #8, #10, #11, #12 | 7.268 linhas | ✅ 100% |
| Sprint 2 | #13, #15, #16 | 2.875 linhas | ✅ 100% |
| Sprint 3 | #19, #20 | ~1.422 linhas | 🔄 67% (2/3) |

---

## 📊 INVENTÁRIO COMPLETO - Componentes Pendentes

### Sprint 3 - Fase Final (1 componente)

| # | Componente | Linhas | Prioridade | Issue | Status |
|---|------------|--------|------------|-------|---------|
| 1 | TelaGestaoFinanceira.tsx | 604 | 🔴 Alta | #21 | ⏳ **PRÓXIMO** |

**Tempo Estimado:** 8-12 horas
**PRD:** [PRD-021](./PRD-021-refatoracao-tela-gestao-financeira.md)
**Instruções:** [INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md)

---

### Sprint 4 - Componentes Médios (500-600 linhas)

| # | Componente | Linhas | Complexidade | Tempo Est. | Issue |
|---|------------|--------|--------------|------------|-------|
| 2 | TelaDashboardProprietario.tsx | 599 | 🟡 Média | 8-10h | A criar |
| 3 | TelaGestaoFrentistas.tsx | 546 | 🟡 Média | 7-9h | A criar |
| 4 | TelaAnaliseVendas.tsx | 539 | 🟡 Média | 7-9h | A criar |
| 5 | TelaGestaoEstoque.tsx | 528 | 🟡 Média | 7-9h | A criar |
| 6 | TelaLeiturasDiarias.tsx | 517 | 🟡 Média | 7-9h | A criar |
| 7 | TelaDashboardEstoque.tsx | 515 | 🟡 Média | 6-8h | A criar |
| 8 | TelaDashboardVendas.tsx | 509 | 🟡 Média | 6-8h | A criar |

**Subtotal:** 3.753 linhas | **Tempo Total:** 48-61 horas

---

### Sprint 5 - Componentes Menores (400-500 linhas)

| # | Componente | Linhas | Complexidade | Tempo Est. | Issue |
|---|------------|--------|--------------|------------|-------|
| 9 | TelaGestaoDespesas.tsx | 498 | 🟢 Baixa | 5-7h | A criar |
| 10 | TelaRelatorioDiario.tsx | 474 | 🟢 Baixa | 5-6h | A criar |
| 11 | TelaAnaliseCustos.tsx | 436 | 🟢 Baixa | 4-6h | A criar |
| 12 | TelaFechamentoDiario/index.tsx | 418 | 🟢 Baixa | 4-5h | A criar |

**Subtotal:** 1.826 linhas | **Tempo Total:** 18-24 horas

---

## 🚀 PLANO DE EXECUÇÃO SEQUENCIAL

### Fase 1: Completar Sprint 3 (IMEDIATO)

**Componente:** TelaGestaoFinanceira.tsx
**Documentação Completa:** ✅ Pronta
**Ação:** Executar [INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md)

**Resultado Esperado:**
```
Sprint 3: ████████████████████ 100% ✅
Dívida Técnica: ~28% → ~15%
```

---

### Fase 2: Sprint 4 - Dashboards e Gestão (7 componentes)

#### 2.1 - TelaDashboardProprietario.tsx (599 linhas)
**Descrição:** Dashboard principal do proprietário com métricas consolidadas
**Módulos a criar:**
- `hooks/dashboard-proprietario/`
  - `useDashboardProprietario.ts` - Agregação de dados
  - `useMetricasGerais.ts` - Cálculos de KPIs
  - `useTendencias.ts` - Análise de tendências
- `components/dashboard-proprietario/`
  - `ResumoExecutivo.tsx` - Cards de resumo
  - `GraficosPerformance.tsx` - Gráficos principais
  - `AlertasGerenciais.tsx` - Alertas e avisos
  - `UltimasTransacoes.tsx` - Últimas movimentações

**Complexidade:** Média
**Tempo:** 8-10 horas
**Padrão:** Similar ao StrategicDashboard (#13)

---

#### 2.2 - TelaGestaoFrentistas.tsx (546 linhas)
**Descrição:** Gestão completa de frentistas (CRUD + escalas + desempenho)
**Módulos a criar:**
- `hooks/frentistas/`
  - `useFrentistas.ts` - CRUD de frentistas
  - `useDesempenhoFrentista.ts` - Métricas de performance
  - `useEscalasFrentista.ts` - Gestão de turnos
- `components/frentistas/`
  - `TabelaFrentistas.tsx` - Lista com ações
  - `FormFrentista.tsx` - Formulário de cadastro
  - `CardDesempenho.tsx` - Card de métricas
  - `HistoricoAtividades.tsx` - Log de atividades

**Complexidade:** Média
**Tempo:** 7-9 horas
**Padrão:** Similar ao TelaGestaoClientes (#15)

---

#### 2.3 - TelaAnaliseVendas.tsx (539 linhas)
**Descrição:** Análise detalhada de vendas com gráficos e filtros
**Módulos a criar:**
- `hooks/analise-vendas/`
  - `useAnaliseVendas.ts` - Dados de vendas
  - `useFiltrosVendas.ts` - Filtros avançados
  - `useComparacoes.ts` - Comparações de períodos
- `components/analise-vendas/`
  - `FiltrosAvancados.tsx` - Filtros complexos
  - `GraficosVendas.tsx` - Múltiplos gráficos
  - `TabelaDetalhada.tsx` - Tabela com drill-down
  - `ExportacaoDados.tsx` - Exportação Excel/PDF

**Complexidade:** Média-Alta
**Tempo:** 7-9 horas
**Padrão:** Similar ao TelaGestaoFinanceira (#21)

---

#### 2.4 - TelaGestaoEstoque.tsx (528 linhas)
**Descrição:** Gestão de estoque com controle de tanques e movimentações
**Módulos a criar:**
- `hooks/estoque/`
  - `useEstoque.ts` - Estado de estoque
  - `useMovimentacoes.ts` - Entradas/Saídas
  - `useAlertas.ts` - Alertas de estoque baixo
- `components/estoque/`
  - `TabelaEstoque.tsx` - Lista de produtos
  - `FormMovimentacao.tsx` - Registro de movimentação
  - `CardTanque.tsx` - Status de tanques
  - `HistoricoMovimentacoes.tsx` - Log completo

**Complexidade:** Média
**Tempo:** 7-9 horas
**Padrão:** Similar ao TelaRegistroCompras (#19)

---

#### 2.5 - TelaLeiturasDiarias.tsx (517 linhas)
**Descrição:** Registro de leituras de bicos (encerrantes)
**Módulos a criar:**
- `hooks/leituras/`
  - `useLeituras.ts` - CRUD de leituras
  - `useValidacoes.ts` - Validações de consistência
  - `useCalculosLitros.ts` - Cálculos de volume
- `components/leituras/`
  - `TabelaLeituras.tsx` - Grid de inputs
  - `ResumoLeituras.tsx` - Totalizadores
  - `AlertasInconsistencias.tsx` - Validações visuais
  - `HistoricoComparado.tsx` - Comparação com dias anteriores

**Complexidade:** Média
**Tempo:** 7-9 horas
**Padrão:** Baseado em `useLeituras.ts` existente

---

#### 2.6 - TelaDashboardEstoque.tsx (515 linhas)
**Descrição:** Dashboard visual de estoque com gráficos
**Módulos a criar:**
- `hooks/dashboard-estoque/`
  - `useDashboardEstoque.ts` - Dados agregados
  - `usePrevisoes.ts` - Previsão de ruptura
  - `useGiro.ts` - Análise de giro
- `components/dashboard-estoque/`
  - `GraficosEstoque.tsx` - Gráficos de nível
  - `CardsResumo.tsx` - Cards de métricas
  - `AlertasCriticos.tsx` - Alertas visuais
  - `TabelaProdutos.tsx` - Lista resumida

**Complexidade:** Baixa-Média
**Tempo:** 6-8 horas
**Padrão:** Similar ao TelaDashboardVendas

---

#### 2.7 - TelaDashboardVendas.tsx (509 linhas)
**Descrição:** Dashboard de vendas com gráficos de performance
**Módulos a criar:**
- `hooks/dashboard-vendas/`
  - `useDashboardVendas.ts` - Dados de vendas
  - `useComparativos.ts` - Comparações de período
  - `useRankings.ts` - Rankings de produtos
- `components/dashboard-vendas/`
  - `GraficosVendas.tsx` - Gráficos de tendência
  - `CardsKPI.tsx` - KPIs principais
  - `TabelaTop10.tsx` - Top 10 produtos
  - `ComparativoPeriodos.tsx` - Comparação visual

**Complexidade:** Baixa-Média
**Tempo:** 6-8 horas
**Padrão:** Similar ao TelaDashboardEstoque

---

### Fase 3: Sprint 5 - Componentes Finais (4 componentes)

#### 3.1 - TelaGestaoDespesas.tsx (498 linhas)
**Descrição:** Gestão de despesas operacionais
**Módulos a criar:**
- `hooks/despesas/`
  - `useDespesas.ts` - CRUD de despesas
  - `useCategorias.ts` - Gestão de categorias
  - `useRelatorios.ts` - Relatórios de despesas
- `components/despesas/`
  - `TabelaDespesas.tsx` - Lista de despesas
  - `FormDespesa.tsx` - Formulário de registro
  - `GraficoPorCategoria.tsx` - Gráfico de pizza
  - `ComparativoMensal.tsx` - Comparação mensal

**Tempo:** 5-7 horas

---

#### 3.2 - TelaRelatorioDiario.tsx (474 linhas)
**Descrição:** Relatório consolidado do dia
**Módulos a criar:**
- `hooks/relatorio-diario/`
  - `useRelatorioDiario.ts` - Dados consolidados
  - `useExportacao.ts` - Exportação PDF
- `components/relatorio-diario/`
  - `SecaoVendas.tsx` - Seção de vendas
  - `SecaoDespesas.tsx` - Seção de despesas
  - `SecaoEstoque.tsx` - Seção de estoque
  - `BotoesExportacao.tsx` - Botões de ação

**Tempo:** 5-6 horas

---

#### 3.3 - TelaAnaliseCustos.tsx (436 linhas)
**Descrição:** Análise de custos e margens
**Módulos a criar:**
- `hooks/analise-custos/`
  - `useAnaliseCustos.ts` - Cálculos de custos
  - `useMargens.ts` - Análise de margens
- `components/analise-custos/`
  - `TabelaCustos.tsx` - Tabela detalhada
  - `GraficoMargens.tsx` - Gráfico de margens
  - `ComparativoFornecedores.tsx` - Comparação

**Tempo:** 4-6 horas

---

#### 3.4 - TelaFechamentoDiario/index.tsx (418 linhas)
**Descrição:** Tela de fechamento de caixa
**Módulos a criar:**
- `hooks/fechamento-diario/`
  - `useFechamentoDiario.ts` - Orquestração
  - `useValidacoes.ts` - Validações de fechamento
- `components/fechamento-diario/`
  - `ResumoFechamento.tsx` - Resumo final
  - `SecaoPagamentos.tsx` - Formas de pagamento
  - `DiferencasCaixa.tsx` - Diferenças encontradas

**Tempo:** 4-5 horas
**Nota:** Já existe hook `useFechamento.ts` (256 linhas) - reutilizar

---

## ✅ CRITÉRIOS GLOBAIS DE ACEITE

### Para CADA Componente Refatorado:

#### Código
- [ ] Componente principal <150 linhas
- [ ] Cada hook <150 linhas
- [ ] Cada componente UI <250 linhas
- [ ] Zero uso de `any`
- [ ] JSDoc completo em **PORTUGUÊS**
- [ ] Tipos TypeScript para tudo

#### Funcionalidade
- [ ] Build sem erros (`bun run build`)
- [ ] Dev sem warnings (`bun run dev`)
- [ ] Zero breaking changes
- [ ] Funcionalidade 100% preservada
- [ ] Testes manuais em localhost:3015 passam

#### Documentação
- [ ] CHANGELOG.md atualizado
- [ ] Issue criada e fechada
- [ ] Comentários em lógica complexa

#### Git
- [ ] Branch vinculada à Issue
- [ ] Commits pequenos e semânticos
- [ ] PR com descrição completa
- [ ] CI passou (verde)

---

## 📊 MÉTRICAS ESPERADAS - Projeto Completo

### Após Sprint 3 (TelaGestaoFinanceira)
```
Total Refatorado: ~10.747 linhas
Dívida Técnica: ~15%
Sprint 3: 100% ✅
```

### Após Sprint 4 (7 componentes médios)
```
Total Refatorado: ~14.500 linhas
Dívida Técnica: ~5%
Sprint 4: 100% ✅
```

### Após Sprint 5 (4 componentes finais)
```
Total Refatorado: ~16.326 linhas
Dívida Técnica: ~0% 🎉
Sprint 5: 100% ✅

REFATORAÇÃO COMPLETA! ✨
```

---

## 🎯 ORDEM DE EXECUÇÃO RECOMENDADA

### Prioridade Máxima (Fazer Primeiro)
1. **TelaGestaoFinanceira.tsx** - Completar Sprint 3
2. **TelaDashboardProprietario.tsx** - Dashboard crítico
3. **TelaLeiturasDiarias.tsx** - Operação diária essencial

### Prioridade Alta (Fazer em Seguida)
4. **TelaGestaoEstoque.tsx** - Controle de estoque
5. **TelaAnaliseVendas.tsx** - Análise de vendas
6. **TelaGestaoFrentistas.tsx** - Gestão de equipe

### Prioridade Média (Fazer Depois)
7. **TelaDashboardEstoque.tsx** - Dashboard secundário
8. **TelaDashboardVendas.tsx** - Dashboard secundário
9. **TelaGestaoDespesas.tsx** - Gestão financeira

### Prioridade Baixa (Fazer Por Último)
10. **TelaRelatorioDiario.tsx** - Relatórios
11. **TelaAnaliseCustos.tsx** - Análise
12. **TelaFechamentoDiario/index.tsx** - Já tem hooks prontos

---

## 📚 PADRÕES E REFERÊNCIAS

### Componentes de Referência (Já Refatorados)

#### Padrão Completo - Registro de Compras (#19)
- **Arquivo:** `src/components/registro-compras/`
- **Estrutura:** 3 hooks + 5 componentes + 1 orquestrador
- **Redução:** 807 → 101 linhas (87.5%)
- **Use como modelo para:** Componentes com cálculos complexos

#### Padrão Dashboard - Strategic Dashboard (#13)
- **Arquivo:** `src/components/ai/strategic-dashboard/`
- **Estrutura:** 4 hooks + 6 componentes
- **Redução:** 1.010 → 95 linhas (91%)
- **Use como modelo para:** Dashboards com múltiplos gráficos

#### Padrão CRUD - Gestão de Clientes (#15)
- **Arquivo:** `src/components/clientes/`
- **Estrutura:** 2 hooks + 4 componentes
- **Redução:** 882 → 89 linhas (90%)
- **Use como modelo para:** Telas de gestão com CRUD

### Hooks Existentes (Reutilizar)

| Hook | Linhas | Função | Reutilizar em |
|------|--------|--------|---------------|
| `useFechamento.ts` | 256 | Cálculos de fechamento | TelaFechamentoDiario |
| `useLeituras.ts` | 441 | Gestão de leituras | TelaLeiturasDiarias |
| `usePagamentos.ts` | 163 | Gestão de pagamentos | TelaRelatorioDiario |
| `useAutoSave.ts` | 198 | Auto-salvamento | Todos os formulários |

---

## ⚠️ REGRAS CRÍTICAS (LEMBRETE)

### ❌ PROIBIDO
- Usar inglês em comentários/strings
- Usar `any` em qualquer lugar
- Criar código sem JSDoc
- Fazer commits grandes
- Pular testes manuais
- Alterar funcionalidade existente

### ✅ OBRIGATÓRIO
- TODO em Português (Brasil)
- JSDoc em TODOS os arquivos
- Tipos TypeScript rigorosos
- Commits semânticos pequenos
- Testar TUDO antes de commitar
- Seguir padrão dos exemplos

---

## 🚀 PRÓXIMO PASSO IMEDIATO

**AGORA:** Executar [INSTRUCOES-AGENTE.md](./INSTRUCOES-AGENTE.md) para completar **TelaGestaoFinanceira.tsx**

**Após conclusão:** Voltar a este plano e iniciar **TelaDashboardProprietario.tsx** (PRD a ser criado)

---

## 📈 LINHA DO TEMPO ESTIMADA

```
Semana 1: TelaGestaoFinanceira.tsx (8-12h)
         Sprint 3: 100% ✅

Semana 2-3: TelaDashboardProprietario + TelaLeiturasDiarias + TelaGestaoEstoque
           (22-28h)

Semana 4-5: TelaAnaliseVendas + TelaGestaoFrentistas + TelaDashboardEstoque + TelaDashboardVendas
           (26-34h)

Semana 6: TelaGestaoDespesas + TelaRelatorioDiario + TelaAnaliseCustos + TelaFechamentoDiario
         (18-24h)
         Sprint 5: 100% ✅

TOTAL: 74-98 horas (~12-16 dias úteis de trabalho)
```

---

## 🎉 RESULTADO FINAL

Ao completar este plano:

✅ **100% do código refatorado**
✅ **Zero dívida técnica**
✅ **Todos os componentes <150 linhas**
✅ **Documentação completa em português**
✅ **Zero uso de `any`**
✅ **Projeto pronto para produção de longo prazo**

---

**Status:** 📋 Plano Aprovado e Pronto para Execução
**Início:** TelaGestaoFinanceira.tsx (Sprint 3 - Issue #21)
**Conclusão Prevista:** ~12-16 dias úteis
**Última Atualização:** 11/01/2026
