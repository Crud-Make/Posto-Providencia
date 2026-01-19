# PRD-032: Refatoração TelaFechamentoDiario/index.tsx

> **Issue:** A criar
> **Componente:** `TelaFechamentoDiario/index.tsx` (~418 linhas)
> **Sprint:** 5 (Componente 4/4)
> **Prioridade:** 🟢 Baixa

---

## 🎯 Objetivo

Modularizar tela de fechamento de caixa, reutilizando hook existente e separando seções.

---

## 📊 Estrutura Proposta

```
src/components/fechamento-diario/
├── index.tsx                         # ~100 linhas (orquestrador)
│
├── components/
│   ├── ResumoFechamento.tsx          # Resumo final (~120 linhas)
│   ├── SecaoPagamentos.tsx           # Formas de pagamento (~100 linhas)
│   └── DiferencasCaixa.tsx           # Diferenças (~80 linhas)
│
└── hooks/
    ├── useFechamento.ts              # EXISTENTE (256 linhas) - REUTILIZAR
    └── useValidacoesFechamento.ts    # Validações (~100 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useFechamento.ts** ⚠️ JÁ EXISTE
- Reutilizar hook existente em `src/hooks/useFechamento.ts`
- Contém cálculos consolidados de fechamento
- Reduzir duplicação de código

**useValidacoesFechamento.ts**
- Validar totais de vendas vs caixa
- Detectar diferenças (sobra/falta)
- Validar formas de pagamento
- Alertas de inconsistência

### Componentes

**ResumoFechamento.tsx**
- Cards: Receita Total, Despesas, Líquido
- Status geral (OK/Alerta/Erro)
- Botão: Finalizar Fechamento
- Confirmação

**SecaoPagamentos.tsx**
- Tabela: Forma de Pagamento, Valor Sistema, Valor Declarado, Diferença
- Input para valores declarados
- Validação em tempo real
- Totalizadores

**DiferencasCaixa.tsx**
- Lista de diferenças encontradas
- Severidade (crítico/médio/baixo)
- Campo: Justificativa
- Histórico de diferenças

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] Reutilizar useFechamento.ts existente
- [ ] Validações funcionam
- [ ] Cálculos corretos
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Hook Existente:** `src/hooks/useFechamento.ts` (256 linhas) - REUTILIZAR
**Padrão:** Similar ao TelaRegistroCompras (#19)

---

**Tempo Estimado:** 4-5 horas

**Nota:** Este é o componente MAIS SIMPLES da Sprint 5, pois já possui hook robusto pronto.
