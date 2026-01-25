# PRD-030: Refatoração TelaRelatorioDiario.tsx

> **Issue:** A criar
> **Componente:** `TelaRelatorioDiario.tsx` (~474 linhas)
> **Sprint:** 5 (Componente 2/4)
> **Prioridade:** 🟢 Baixa

---

## 🎯 Objetivo

Modularizar relatório diário consolidado, separando seções temáticas e exportação.

---

## 📊 Estrutura Proposta

```
src/components/relatorio-diario/
├── TelaRelatorioDiario.tsx           # ~100 linhas
│
├── components/
│   ├── SecaoVendas.tsx               # Seção de vendas (~120 linhas)
│   ├── SecaoDespesas.tsx             # Seção de despesas (~100 linhas)
│   ├── SecaoEstoque.tsx              # Seção de estoque (~100 linhas)
│   └── BotoesExportacao.tsx          # Botões de ação (~60 linhas)
│
└── hooks/
    ├── useRelatorioDiario.ts         # Dados consolidados (~150 linhas)
    └── useExportacao.ts              # Exportação PDF (~100 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useRelatorioDiario.ts**
- Buscar vendas do dia
- Buscar despesas do dia
- Buscar movimentações de estoque
- Buscar fechamento de caixa
- Consolidar em relatório único

**useExportacao.ts**
- Gerar PDF do relatório
- Gerar Excel
- Enviar por email
- Salvar no servidor

### Componentes

**SecaoVendas.tsx**
- Tabela de vendas por combustível
- Total de litros
- Total em R$
- Formas de pagamento
- Gráfico de barras simples

**SecaoDespesas.tsx**
- Tabela de despesas do dia
- Total geral
- Por categoria
- Comparação com média

**SecaoEstoque.tsx**
- Movimentações do dia
- Nível atual dos tanques
- Alertas (se houver)
- Comparação com dia anterior

**BotoesExportacao.tsx**
- Botão: Exportar PDF
- Botão: Exportar Excel
- Botão: Enviar Email
- Botão: Imprimir
- Loading states

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Todas as seções funcionam
- [ ] Exportação PDF funciona
- [ ] Exportação Excel funciona
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaRegistroCompras (#19)
**Hook de exemplo:** `usePagamentos.ts` (163 linhas)

---

**Tempo Estimado:** 5-6 horas
