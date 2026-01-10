# 🚀 SPRINT 2 - Componentes Críticos

> **Início:** 10/01/2026  
> **Branch:** refactor/tech-debt  
> **Objetivo:** Refatorar os 3 componentes mais críticos

---

## 🎯 **OBJETIVO DA SPRINT**

Modularizar os 3 maiores componentes do sistema, reduzindo complexidade e melhorando manutenibilidade.

---

## 📋 **COMPONENTES ALVO**

### **1. StrategicDashboard.tsx** - PRD-013
- **Linhas:** 1.010
- **Tamanho:** 71 KB
- **Localização:** `src/components/ai/StrategicDashboard.tsx`
- **Prioridade:** 🔴 CRÍTICA
- **Estimativa:** 8-12 horas

**Problemas:**
- Dashboard AI monolítico
- Lógica de negócio misturada com UI
- Múltiplas responsabilidades em um arquivo
- Difícil de testar e manter

**Solução Proposta:**
```
components/ai/strategic-dashboard/
├── StrategicDashboard.tsx          # Orquestrador (100 linhas)
├── components/
│   ├── MetricsCards.tsx            # Cards de métricas
│   ├── WeeklyVolumeChart.tsx       # Gráfico semanal
│   ├── AIInsightsPanel.tsx         # Painel de insights
│   ├── StockAlertsPanel.tsx        # Alertas de estoque
│   ├── TopPerformersPanel.tsx      # Top frentistas
│   ├── AIPromotionSimulator.tsx    # Simulador de promoções
│   └── AIChatConsultant.tsx        # Chat com IA
└── hooks/
    ├── useDashboardMetrics.ts      # Métricas
    ├── useWeeklyVolume.ts          # Volume semanal
    ├── useAIInsights.ts            # Insights IA
    ├── useStockAlerts.ts           # Alertas
    ├── useTopPerformers.ts         # Performance
    └── useAIPromotion.ts           # Promoções
```

---

### **2. TelaConfiguracoes.tsx** - PRD-014
- **Linhas:** 924
- **Tamanho:** 43 KB
- **Localização:** `src/components/TelaConfiguracoes.tsx`
- **Prioridade:** 🔴 ALTA
- **Estimativa:** 6-8 horas

**Solução Proposta:**
```
components/configuracoes/
├── TelaConfiguracoes.tsx           # Orquestrador (80 linhas)
├── sections/
│   ├── CombustiveisConfig.tsx      # Combustíveis
│   ├── PagamentosConfig.tsx        # Pagamentos
│   ├── BicosConfig.tsx             # Bicos
│   └── GeralConfig.tsx             # Geral
└── hooks/
    └── useConfiguracao.ts          # Lógica
```

---

### **3. TelaGestaoClientes.tsx** - PRD-015
- **Linhas:** 882
- **Tamanho:** 54 KB
- **Localização:** `src/components/TelaGestaoClientes.tsx`
- **Prioridade:** 🔴 ALTA
- **Estimativa:** 6-8 horas

**Solução Proposta:**
```
components/clientes/
├── TelaGestaoClientes.tsx          # Orquestrador (100 linhas)
├── components/
│   ├── ClientesList.tsx            # Listagem
│   ├── ClienteForm.tsx             # Formulário
│   └── ClienteDetails.tsx          # Detalhes
└── hooks/
    ├── useClientes.ts              # Lógica
    └── useClienteForm.ts           # Validação
```

---

## 📅 **CRONOGRAMA**

| Semana | Atividade | Horas |
|--------|-----------|-------|
| 1 | PRD-013: StrategicDashboard | 8-12h |
| 2 | PRD-014: TelaConfiguracoes | 6-8h |
| 3 | PRD-015: TelaGestaoClientes | 6-8h |

**Total:** 20-28 horas

---

## ✅ **CRITÉRIOS DE ACEITE**

- [ ] Cada componente dividido em módulos <300 linhas
- [ ] Hooks extraídos para lógica de negócio
- [ ] Componentes de UI reutilizáveis
- [ ] Zero breaking changes
- [ ] Build passa sem erros
- [ ] Testes manuais OK

---

## 📊 **MÉTRICAS DE SUCESSO**

| Métrica | Antes | Meta |
|---------|-------|------|
| Maior componente | 1.010 linhas | <300 linhas |
| Componentes >800 linhas | 3 | 0 |
| Reusabilidade | Baixa | Alta |
| Testabilidade | Difícil | Fácil |

---

**Próximo passo:** Criar PRD-013 detalhado para StrategicDashboard
