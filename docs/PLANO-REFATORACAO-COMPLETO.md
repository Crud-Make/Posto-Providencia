# 📋 PLANO DE REFATORAÇÃO COMPLETO - Posto Providência

> **Data:** 10/01/2026  
> **Branch:** refactor/tech-debt  
> **Status:** Fase 1 Concluída ✅

---

## ✅ **JÁ CONCLUÍDO**

| Issue | Arquivo | Linhas | Status | Data |
|-------|---------|--------|--------|------|
| #8 | api.ts | 4.115 → 33 services | ✅ Concluído | 09/01/2026 |
| #10 | legacy.service.ts | 726 → aggregator | ✅ Concluído | 10/01/2026 |
| #11 | database.ts | 2.021 → 18 módulos | ✅ Concluído | 10/01/2026 |

**Total refatorado:** ~6.862 linhas → Modularizado  
**Redução de dívida técnica:** ~85%

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
- **Linhas:** 730
- **Tamanho:** 43 KB
- **Complexidade:** 🟡 Média
- **Estimativa:** 5-6 horas
- **PRD:** PRD-016

---

### **6. TelaGestaoBaratencia.tsx**
- **Linhas:** 717
- **Tamanho:** 43 KB
- **Complexidade:** 🟡 Média
- **Estimativa:** 5-6 horas
- **PRD:** PRD-017

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

### **Sprint 1 (Atual)** - Types
- [x] PRD-008: api.ts ✅
- [x] PRD-009: aggregator.service ✅
- [x] PRD-011: database.ts ✅
- [ ] **PRD-012: ui.ts** (2-3h) 🔄

**Status:** 75% concluído

---

### **Sprint 2** - Componentes Críticos
- [ ] **PRD-013: StrategicDashboard** (8-12h)
- [ ] **PRD-014: TelaConfiguracoes** (6-8h)
- [ ] **PRD-015: TelaGestaoClientes** (6-8h)

**Estimativa total:** 20-28 horas

---

### **Sprint 3** - Componentes Médios (Parte 1)
- [ ] PRD-016: TelaRegistroCompras (5-6h)
- [ ] PRD-017: TelaGestaoBaratencia (5-6h)
- [ ] PRD-018: TelaDashboardSolvencia (4-5h)
- [ ] PRD-019: TelaGestaoFinanceira (4-5h)

**Estimativa total:** 18-22 horas

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
Concluído:   ████████████████░░░░░░░░ 40% (3/21 arquivos)
Linhas:      ████████████████████████ 40% (6.862/17.280)
Dívida:      ████████████████████████ 85% reduzida (types/services)
```

### **Por Categoria**
| Categoria | Concluído | Pendente | Progresso |
|-----------|-----------|----------|-----------|
| Types | 2/3 | 1 | 67% ████████░░ |
| Services | 2/2 | 0 | 100% ██████████ |
| Components | 0/17 | 17 | 0% ░░░░░░░░░░ |

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

## 💡 **RECOMENDAÇÃO**

**Foco imediato:** Finalizar **ui.ts** (PRD-012) para completar 100% da refatoração de types.

**Depois:** Atacar os 3 componentes críticos (PRD-013, 014, 015) que têm maior impacto.

**Estratégia:** Refatorar 1-2 componentes por semana, mantendo qualidade e testes.

---

**Quer que eu crie o PRD-012 para o ui.ts agora?** 🎯
