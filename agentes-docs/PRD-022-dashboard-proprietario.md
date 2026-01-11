# PRD-022: Refatoração TelaDashboardProprietario.tsx

> **Issue:** A criar
> **Componente:** `TelaDashboardProprietario.tsx` (~599 linhas)
> **Sprint:** 4 (Componente 1/7)
> **Prioridade:** 🔴 Alta

---

## 🎯 Objetivo

Refatorar o dashboard principal do proprietário, extraindo lógica de agregação de métricas e visualizações em hooks e componentes especializados.

---

## 📊 Estrutura Proposta

```
src/components/dashboard-proprietario/
├── TelaDashboardProprietario.tsx     # ~100 linhas
│
├── components/
│   ├── ResumoExecutivo.tsx           # Cards principais (~120 linhas)
│   ├── GraficosPerformance.tsx       # Gráficos Recharts (~180 linhas)
│   ├── AlertasGerenciais.tsx         # Alertas críticos (~100 linhas)
│   └── UltimasTransacoes.tsx         # Lista resumida (~80 linhas)
│
└── hooks/
    ├── useDashboardProprietario.ts   # Orquestração (~150 linhas)
    ├── useMetricasGerais.ts          # Cálculos de KPIs (~120 linhas)
    └── useTendencias.ts              # Análise de tendências (~100 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useDashboardProprietario.ts**
- Orquestrar carregamento de dados
- Gerenciar período selecionado
- Agregar dados de múltiplas fontes

**useMetricasGerais.ts**
- Calcular receita total
- Calcular despesas totais
- Calcular lucro líquido
- Calcular margem de lucro
- Calcular ticket médio

**useTendencias.ts**
- Comparação com período anterior
- Cálculo de variação percentual
- Identificação de tendências (alta/baixa/estável)
- Projeções simples

### Componentes

**ResumoExecutivo.tsx**
- 4-6 cards de métricas principais
- Cores semânticas (verde/vermelho)
- Variação percentual vs período anterior
- Loading skeleton

**GraficosPerformance.tsx**
- Gráfico de linha: Receita vs Despesa
- Gráfico de barras: Vendas por combustível
- Gráfico de pizza: Formas de pagamento
- Tooltip customizado

**AlertasGerenciais.tsx**
- Alertas de estoque baixo
- Alertas de despesas altas
- Alertas de margem baixa
- Ícones e cores por severidade

**UltimasTransacoes.tsx**
- Últimas 10 transações
- Data, tipo, valor
- Badge de tipo de transação
- Link para detalhes

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Cada hook <150 linhas
- [ ] Cada componente <200 linhas
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Gráficos renderizam corretamente
- [ ] Filtros de período funcionam
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao StrategicDashboard (#13)
**Arquivo de exemplo:** `src/components/ai/strategic-dashboard/`

---

**Tempo Estimado:** 8-10 horas
