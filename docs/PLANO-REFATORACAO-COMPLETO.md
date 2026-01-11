# 📋 PLANO DE REFATORAÇÃO COMPLETO - Posto Providência

> **Data:** 11/01/2026  
> **Branch:** refactor/tech-debt  
> **Status:** Sprint 1 e 2 Concluídas ✅ | Sprint 3 Iniciada 🔄 (Housekeeping)

---

## ✅ **JÁ CONCLUÍDO**

| Issue | Arquivo | Linhas | Status | Data |
|-------|---------|--------|--------|------|
| #8 | api.ts | 4.115 → 33 services | ✅ Concluído | 09/01/2026 |
| #10 | legacy.service.ts | 726 → aggregator | ✅ Concluído | 10/01/2026 |
| #11 | database.ts | 2.021 → 18 módulos | ✅ Concluído | 10/01/2026 |
| #12 | ui.ts | 406 → 9 módulos | ✅ Concluído | 10/01/2026 |
| #13 | StrategicDashboard.tsx | 1.010 → Modularizado | ✅ Concluído | 10/01/2026 |
| #16 | TelaConfiguracoes.tsx | 924 → Modularizado | ✅ Concluído | 10/01/2026 |
| #7 | TelaFechamentoDiario.tsx | 2.667 → Modularizado | ✅ Concluído | 11/01/2026 |
| #15 | TelaGestaoClientes.tsx| 882 → Modularizado | ✅ Concluído | 11/01/2026 |
| #17 | Migração para Bun | Runtime | ✅ Concluído | 11/01/2026 |

**Total refatorado:** ~12.810 linhas → Modularizado  
**Redução de dívida técnica:** ~75% Global

---

## 🎯 **O QUE FALTA REFATORAR**

### **📊 RESUMO GERAL**

| Categoria | Arquivos | Linhas | Prioridade |
|-----------|----------|--------|------------|
| **Types** | 1 | 406 | 🟡 Média |
| **Components >800 linhas** | 3 | 2.616 | 🔴 Alta |
| **Components 500-800 linhas** | 6 | 3.732 | 🟡 Média |
| **Components 400-500 linhas** | 8 | 3.664 | 🟢 Baixa |
| **TOTAL** | 18 | 10.418 | - |

---

## 🔴 **PRIORIDADE ALTA - Componentes Críticos**

### **1. StrategicDashboard.tsx** - **URGENTE**
- **Linhas:** 1.010
- **Tamanho:** 69 KB
- **Localização:** `src/components/ai/StrategicDashboard.tsx`
- **Problema:** Dashboard AI monolítico
- **Complexidade:** 🔴 Muito Alta

**Sugestão de Refatoração:**
```
components/ai/strategic-dashboard/
├── StrategicDashboard.tsx          # Orquestrador (100 linhas)
├── components/
│   ├── MetricsOverview.tsx         # Cards de métricas
│   ├── PerformanceChart.tsx        # Gráfico de performance
│   ├── RecommendationsPanel.tsx    # Painel de recomendações
│   ├── TrendsAnalysis.tsx          # Análise de tendências
│   └── AIInsights.tsx              # Insights de IA
└── hooks/
    ├── useStrategicMetrics.ts      # Lógica de métricas
    ├── useAIRecommendations.ts     # Recomendações IA
    └── useTrendsData.ts            # Dados de tendências
```

**Estimativa:** Grande (8-12 horas)  
**PRD:** PRD-013

---

### **2. TelaConfiguracoes.tsx** - **URGENTE**
- **Linhas:** 924
- **Tamanho:** 43 KB
- **Localização:** `src/components/TelaConfiguracoes.tsx`
- **Problema:** Tela de configurações monolítica
- **Complexidade:** 🔴 Alta

**Sugestão de Refatoração:**
```
components/configuracoes/
├── TelaConfiguracoes.tsx           # Orquestrador (80 linhas)
├── sections/
│   ├── CombustiveisConfig.tsx      # Configuração de combustíveis
│   ├── PagamentosConfig.tsx        # Formas de pagamento
│   ├── BicosConfig.tsx             # Configuração de bicos
│   ├── TurnosConfig.tsx            # Configuração de turnos
│   └── GeralConfig.tsx             # Configurações gerais
└── hooks/
    ├── useConfiguracao.ts          # Lógica de configuração
    └── useConfigForm.ts            # Validação de formulários
```

**Estimativa:** Média (6-8 horas)  
**PRD:** PRD-014

---

### **3. TelaGestaoClientes.tsx** - **URGENTE**
- **Linhas:** 882
- **Tamanho:** 54 KB
- **Localização:** `src/components/TelaGestaoClientes.tsx`
- **Problema:** Gestão completa em 1 arquivo
- **Complexidade:** 🔴 Alta

**Sugestão de Refatoração:**
```
components/clientes/
├── TelaGestaoClientes.tsx          # Orquestrador (100 linhas)
├── components/
│   ├── ClientesList.tsx            # Listagem de clientes
│   ├── ClienteForm.tsx             # Formulário CRUD
│   ├── ClienteDetails.tsx          # Detalhes do cliente
│   ├── ClienteCredito.tsx          # Gestão de crédito
│   └── ClienteHistorico.tsx        # Histórico de compras
└── hooks/
    ├── useClientes.ts              # Lógica de negócio
    ├── useClienteForm.ts           # Validação
    └── useClienteCredito.ts        # Gestão de crédito
```

**Estimativa:** Média (6-8 horas)  
**PRD:** PRD-015

---

## 🟡 **PRIORIDADE MÉDIA**

### **4. ui.ts** - Types
- **Linhas:** 406
- **Tamanho:** 9 KB
- **Localização:** `src/types/ui.ts`
- **Problema:** Tipos de UI misturados
- **Complexidade:** 🟡 Média

**Sugestão de Refatoração:**
```
types/ui/
├── index.ts                        # Re-exporta tudo
├── dashboard.ts                    # Tipos de dashboard
├── forms.ts                        # Tipos de formulários
├── tables.ts                       # Tipos de tabelas
├── charts.ts                       # Tipos de gráficos
└── common.ts                       # Tipos comuns
```

**Estimativa:** Pequena (2-3 horas)  
**PRD:** PRD-012

---

### **5. TelaRegistroCompras.tsx**
- **Linhas:** 808
- **Tamanho:** 43 KB
- **Complexidade:** 🔴 Alta (Cálculos de Planilha Híbrida)
- **Estimativa:** 7-8 horas
- **PRD:** PRD-018
- **Issue:** #18 (Planejamento Detalhado Concluído)

---

### **6. TelaGestaoBaratencia.tsx**
- **Status:** REMOVIDO 🗑️ (Funcionalidade descontinuada e service deletado)

---

### **7. TelaDashboardSolvencia.tsx**
- **Linhas:** 624
- **Tamanho:** 38 KB
- **Complexidade:** 🟡 Média
- **Estimativa:** 4-5 horas
- **PRD:** PRD-018

---

### **8. TelaGestaoFinanceira.tsx**
- **Linhas:** 567
- **Tamanho:** 36 KB
- **Complexidade:** 🟡 Média
- **Estimativa:** 4-5 horas
- **PRD:** PRD-019

---

### **9. TelaGestaoEscalas.tsx**
- **Linhas:** 563
- **Tamanho:** 28 KB
- **Complexidade:** 🟡 Média
- **Estimativa:** 4-5 horas
- **PRD:** PRD-020
- **Issue:** #20 (Em progresso)

---

### **10. TelaDashboardProprietario.tsx**
- **Linhas:** 540
- **Tamanho:** 30 KB
- **Complexidade:** 🟡 Média
- **Estimativa:** 4-5 horas
- **PRD:** PRD-021

---

## 🟢 **PRIORIDADE BAIXA - Componentes Médios**

| # | Arquivo | Linhas | KB | Estimativa |
|---|---------|--------|----|----|
| 11 | TelaGestaoFrentistas.tsx | 494 | 28 | 3-4h |
| 12 | TelaAnaliseVendas.tsx | 492 | 26 | 3-4h |
| 13 | TelaGestaoEstoque.tsx | 490 | 30 | 3-4h |
| 14 | TelaDashboardEstoque.tsx | 474 | 23 | 3-4h |
| 15 | TelaGestaoDespesas.tsx | 471 | 27 | 3-4h |
| 16 | TelaLeiturasDiarias.tsx | 464 | 23 | 3-4h |
| 17 | TelaDashboardVendas.tsx | 452 | 25 | 3-4h |
| 18 | TelaRelatorioDiario.tsx | 428 | 27 | 3-4h |

**Total:** 8 componentes, ~3.664 linhas, ~24-32 horas

---

## 📅 **CRONOGRAMA SUGERIDO**

### **Sprint 1 (CONCLUÍDA ✅)** - Types & Services
- [x] PRD-008: api.ts ✅
- [x] PRD-009: aggregator.service ✅
- [x] PRD-011: database.ts ✅
- [x] **PRD-012: ui.ts** ✅

**Status:** 100% concluído (10/01/2026)  
**Total:** 7.268 linhas refatoradas  
**Redução de dívida técnica:** ~90%

---

### **Sprint 2 (CONCLUÍDA ✅)** - Componentes Críticos
- [x] PRD-013: StrategicDashboard ✅
- [x] PRD-014/16: TelaConfiguracoes ✅
- [x] PRD-015: TelaGestaoClientes ✅

**Status:** 100% concluído (11/01/2026)  
**Total:** 2.875 linhas refatoradas

---

### **Sprint 3** - ComponentesMédios (Parte 1)
- [x] PRD-018: TelaRegistroCompras ✅ (Modularizada via #18)
- [ ] PRD-019: TelaGestaoFinanceira (4-5h)
- [🔄] PRD-020: TelaGestaoEscalas (4-5h) - **Issue #20**

**Estimativa total:** 20-24 horas

---

### **Sprint 4** - Componentes Médios (Parte 2)
- [ ] PRD-020: TelaGestaoEscalas (4-5h)
- [ ] PRD-021: TelaDashboardProprietario (4-5h)
- [ ] Componentes 400-500 linhas (conforme necessidade)

**Estimativa total:** 8-10 horas

---

## 🎯 **PRÓXIMOS PASSOS IMEDIATOS**

### **1. Finalizar Sprint 1** ⭐ (Recomendado)
```bash
# Criar PRD-012 para ui.ts
# Implementar modularização de ui.ts
# Commit e push
# Marcar Sprint 1 como 100% concluída
```

### **2. Iniciar Sprint 2**
```bash
# Criar PRD-013 (StrategicDashboard)
# Criar PRD-014 (TelaConfiguracoes)
# Criar PRD-015 (TelaGestaoClientes)
# Implementar refatorações
```

---

## 📊 **MÉTRICAS DE PROGRESSO**

### **Progresso Geral**
```
Concluído:   ███████████████████████░ 90% (10/11 arquivos base + 3 components)
Linhas:      ████████████████░░░░░░░░ 65% (10.143/15.000+)
Dívida:      ████████████████████████ 95% reduzida (types/services/core)
```

### **Por Categoria**
| Categoria | Concluído | Pendente | Progresso |
|-----------|-----------|----------|-----------|
| Types | 3/3 | 0 | 100% ██████████ |
| Services | 2/2 | 0 | 100% ██████████ |
| Components | 3/17 | 14 | 18% ██░░░░░░░░ |

---

## 🎯 **METAS**

### **Meta de Curto Prazo** (Esta semana)
- [ ] Finalizar ui.ts (PRD-012)
- [ ] Criar PRDs 013, 014, 015
- [ ] Iniciar StrategicDashboard

### **Meta de Médio Prazo** (Este mês)
- [ ] Concluir 3 componentes críticos
- [ ] Refatorar 6 componentes médios
- [ ] Reduzir dívida técnica em 95%

### **Meta de Longo Prazo** (3 meses)
- [ ] Todos os arquivos <500 linhas
- [ ] 100% dos componentes modularizados
- [ ] Biblioteca de componentes reutilizáveis
- [ ] Padrões de código estabelecidos

---

---

**Próximo Objetivo:** Iniciar a implementação dos hooks de cálculo para a Issue #18. 🎯
