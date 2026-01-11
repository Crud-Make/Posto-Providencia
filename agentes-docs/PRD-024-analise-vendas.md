# PRD-024: Refatoração TelaAnaliseVendas.tsx

> **Issue:** A criar
> **Componente:** `TelaAnaliseVendas.tsx` (~539 linhas)
> **Sprint:** 4 (Componente 3/7)
> **Prioridade:** 🟡 Média

---

## 🎯 Objetivo

Modularizar tela de análise de vendas, separando filtros avançados, gráficos e exportação em componentes especializados.

---

## 📊 Estrutura Proposta

```
src/components/analise-vendas/
├── TelaAnaliseVendas.tsx             # ~100 linhas
│
├── components/
│   ├── FiltrosAvancados.tsx          # Filtros complexos (~150 linhas)
│   ├── GraficosVendas.tsx            # Múltiplos gráficos (~200 linhas)
│   ├── TabelaDetalhada.tsx           # Tabela drill-down (~180 linhas)
│   └── ExportacaoDados.tsx           # Exportação (~80 linhas)
│
└── hooks/
    ├── useAnaliseVendas.ts           # Dados de vendas (~150 linhas)
    ├── useFiltrosVendas.ts           # Filtros avançados (~100 linhas)
    └── useComparacoes.ts             # Comparações (~80 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useAnaliseVendas.ts**
- Buscar vendas por período
- Filtrar por combustível, bico, frentista
- Agrupar por dia/semana/mês
- Calcular totais

**useFiltrosVendas.ts**
- Estado de filtros complexos
- Data início/fim
- Combustíveis selecionados
- Bicos selecionados
- Frentistas selecionados
- Aplicar/resetar filtros

**useComparacoes.ts**
- Comparar período atual vs anterior
- Calcular variação percentual
- Identificar tendências
- Calcular médias móveis

### Componentes

**FiltrosAvancados.tsx**
- DatePicker início/fim
- Multi-select combustíveis
- Multi-select bicos
- Multi-select frentistas
- Botões: Aplicar, Limpar, Presets

**GraficosVendas.tsx**
- Gráfico de linha: Evolução temporal
- Gráfico de barras: Por combustível
- Gráfico de pizza: Por forma de pagamento
- Responsivo

**TabelaDetalhada.tsx**
- Colunas: Data, Combustível, Litros, Valor, Frentista
- Ordenação
- Paginação
- Expansão para detalhes
- Totalizadores no rodapé

**ExportacaoDados.tsx**
- Botão Excel
- Botão PDF
- Botão CSV
- Preview antes de exportar

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Filtros funcionam corretamente
- [ ] Gráficos renderizam
- [ ] Exportação funciona
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaGestaoFinanceira (#21)
**Arquivo de exemplo:** `src/components/financeiro/`

---

**Tempo Estimado:** 7-9 horas
