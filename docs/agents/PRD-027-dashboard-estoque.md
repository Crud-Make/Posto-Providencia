# PRD-027: Refatoração TelaDashboardEstoque.tsx

> **Issue:** A criar
> **Componente:** `TelaDashboardEstoque.tsx` (~515 linhas)
> **Sprint:** 4 (Componente 6/7)
> **Prioridade:** 🟡 Média

---

## 🎯 Objetivo

Modularizar dashboard de estoque, separando visualizações, previsões e alertas em componentes especializados.

---

## 📊 Estrutura Proposta

```
src/components/dashboard-estoque/
├── TelaDashboardEstoque.tsx          # ~100 linhas
│
├── components/
│   ├── GraficosEstoque.tsx           # Gráficos de nível (~150 linhas)
│   ├── CardsResumo.tsx               # Cards de métricas (~100 linhas)
│   ├── AlertasCriticos.tsx           # Alertas visuais (~80 linhas)
│   └── TabelaProdutos.tsx            # Lista resumida (~100 linhas)
│
└── hooks/
    ├── useDashboardEstoque.ts        # Dados agregados (~150 linhas)
    ├── usePrevisoes.ts               # Previsão de ruptura (~100 linhas)
    └── useGiro.ts                    # Análise de giro (~80 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useDashboardEstoque.ts**
- Buscar estoque atual de todos produtos
- Buscar movimentações do período
- Calcular métricas consolidadas
- Filtrar por combustível

**usePrevisoes.ts**
- Calcular média de consumo diário
- Prever data de ruptura
- Calcular dias restantes
- Sugerir data de reposição

**useGiro.ts**
- Calcular giro de estoque (vendas/estoque médio)
- Identificar produtos de alto/baixo giro
- Calcular tempo médio em estoque
- Análise ABC

### Componentes

**GraficosEstoque.tsx**
- Gráfico de barras: Nível atual vs Capacidade
- Gráfico de linha: Evolução do estoque (7 dias)
- Gráfico de pizza: Distribuição por combustível
- Gauge: Ocupação total

**CardsResumo.tsx**
- Card: Total em estoque (litros)
- Card: Capacidade total
- Card: Ocupação (%)
- Card: Dias para ruptura (média)
- Cores por status

**AlertasCriticos.tsx**
- Lista de produtos em alerta
- Severidade: Crítico/Alerta/OK
- Ícones e cores
- Botão: Ver detalhes

**TabelaProdutos.tsx**
- Colunas: Produto, Estoque, Capacidade, %, Dias Restantes
- Ordenação
- Filtro rápido
- Badge de status

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Gráficos renderizam corretamente
- [ ] Previsões calculadas
- [ ] Alertas funcionam
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaDashboardVendas
**Hook de exemplo:** `useDashboardEstoque.ts`

---

**Tempo Estimado:** 6-8 horas
