# PRD-028: Refatoração TelaDashboardVendas.tsx

> **Issue:** A criar
> **Componente:** `TelaDashboardVendas.tsx` (~509 linhas)
> **Sprint:** 4 (Componente 7/7)
> **Prioridade:** 🟡 Média

---

## 🎯 Objetivo

Modularizar dashboard de vendas, separando gráficos, comparativos e rankings em componentes especializados.

---

## 📊 Estrutura Proposta

```
src/components/dashboard-vendas/
├── TelaDashboardVendas.tsx           # ~100 linhas
│
├── components/
│   ├── GraficosVendas.tsx            # Gráficos de tendência (~150 linhas)
│   ├── CardsKPI.tsx                  # KPIs principais (~100 linhas)
│   ├── TabelaTop10.tsx               # Top 10 produtos (~80 linhas)
│   └── ComparativoPeriodos.tsx       # Comparação visual (~120 linhas)
│
└── hooks/
    ├── useDashboardVendas.ts         # Dados de vendas (~150 linhas)
    ├── useComparativos.ts            # Comparações (~100 linhas)
    └── useRankings.ts                # Rankings (~80 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useDashboardVendas.ts**
- Buscar vendas do período
- Filtrar por combustível, frentista
- Agrupar por dia/semana/mês
- Calcular totais

**useComparativos.ts**
- Comparar período atual vs anterior
- Calcular variação percentual
- Identificar melhor/pior dia
- Médias móveis

**useRankings.ts**
- Top 10 combustíveis por volume
- Top 10 combustíveis por valor
- Top 10 frentistas
- Bottom 3 produtos

### Componentes

**GraficosVendas.tsx**
- Gráfico de linha: Evolução diária
- Gráfico de barras: Por combustível
- Gráfico de área: Comparativo atual vs anterior
- Tooltip customizado

**CardsKPI.tsx**
- Card: Receita Total
- Card: Volume Total (litros)
- Card: Ticket Médio
- Card: Transações
- Variação vs período anterior

**TabelaTop10.tsx**
- Colunas: Posição, Produto, Volume, Valor, %
- Badge de posição (1º, 2º, 3º)
- Barra de progresso visual
- Filtro: Volume/Valor

**ComparativoPeriodos.tsx**
- Gráfico de barras comparativo
- Período atual vs anterior
- Por combustível
- Cores diferenciadas

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Gráficos renderizam
- [ ] Comparativos corretos
- [ ] Rankings funcionam
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaDashboardEstoque (#27)
**Exemplo:** `src/components/dashboard-estoque/`

---

**Tempo Estimado:** 6-8 horas
