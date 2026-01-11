# PRD-031: Refatoração TelaAnaliseCustos.tsx

> **Issue:** A criar
> **Componente:** `TelaAnaliseCustos.tsx` (~436 linhas)
> **Sprint:** 5 (Componente 3/4)
> **Prioridade:** 🟢 Baixa

---

## 🎯 Objetivo

Modularizar análise de custos e margens, separando cálculos e visualizações.

---

## 📊 Estrutura Proposta

```
src/components/analise-custos/
├── TelaAnaliseCustos.tsx             # ~100 linhas
│
├── components/
│   ├── TabelaCustos.tsx              # Tabela detalhada (~150 linhas)
│   ├── GraficoMargens.tsx            # Gráfico de margens (~120 linhas)
│   └── ComparativoFornecedores.tsx   # Comparação (~100 linhas)
│
└── hooks/
    ├── useAnaliseCustos.ts           # Cálculos de custos (~150 linhas)
    └── useMargens.ts                 # Análise de margens (~100 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useAnaliseCustos.ts**
- Buscar compras por período
- Calcular custo médio por combustível
- Calcular custo total
- Agrupar por fornecedor
- Identificar variações de preço

**useMargens.ts**
- Calcular margem bruta (%)
- Calcular margem líquida (%)
- Calcular markup
- Comparar margens por produto
- Identificar produtos com margem baixa

### Componentes

**TabelaCustos.tsx**
- Colunas: Produto, Custo Médio, Preço Venda, Margem (%), Markup
- Ordenação
- Filtros
- Cores por margem (verde/amarelo/vermelho)
- Totalizadores

**GraficoMargens.tsx**
- Gráfico de barras: Margem por produto
- Linha de meta (margem mínima)
- Cores por status
- Tooltip com detalhes

**ComparativoFornecedores.tsx**
- Tabela de fornecedores
- Preço médio praticado
- Quantidade comprada
- Melhor/Pior preço
- Histórico de compras

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Cálculos de margem corretos
- [ ] Gráficos renderizam
- [ ] Comparativos funcionam
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaAnaliseVendas (#24)
**Hook de exemplo:** `useCalculosRegistro.ts` (162 linhas)

---

**Tempo Estimado:** 4-6 horas
