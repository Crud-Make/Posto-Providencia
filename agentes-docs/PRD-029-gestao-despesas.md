# PRD-029: Refatoração TelaGestaoDespesas.tsx

> **Issue:** A criar
> **Componente:** `TelaGestaoDespesas.tsx` (~498 linhas)
> **Sprint:** 5 (Componente 1/4)
> **Prioridade:** 🟢 Baixa

---

## 🎯 Objetivo

Modularizar gestão de despesas, separando CRUD, categorização e relatórios em componentes especializados.

---

## 📊 Estrutura Proposta

```
src/components/despesas/
├── TelaGestaoDespesas.tsx            # ~100 linhas
│
├── components/
│   ├── TabelaDespesas.tsx            # Lista de despesas (~150 linhas)
│   ├── FormDespesa.tsx               # Form de cadastro (~120 linhas)
│   ├── GraficoPorCategoria.tsx       # Gráfico de pizza (~100 linhas)
│   └── ComparativoMensal.tsx         # Comparação (~120 linhas)
│
└── hooks/
    ├── useDespesas.ts                # CRUD (~150 linhas)
    ├── useCategorias.ts              # Gestão de categorias (~80 linhas)
    └── useRelatorios.ts              # Relatórios (~100 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useDespesas.ts**
- Buscar despesas do período
- Criar nova despesa
- Atualizar despesa
- Deletar despesa (soft delete)
- Filtrar por categoria, período, posto

**useCategorias.ts**
- Buscar categorias de despesas
- Criar categoria
- Cores por categoria
- Ícones por categoria

**useRelatorios.ts**
- Totalizar por categoria
- Totalizar por período
- Comparar mês atual vs anterior
- Calcular médias

### Componentes

**TabelaDespesas.tsx**
- Colunas: Data, Descrição, Categoria, Valor, Ações
- Ordenação
- Paginação (20/página)
- Filtros rápidos
- Totalizador no rodapé

**FormDespesa.tsx**
- Campos: Data, Categoria, Descrição, Valor, Anexo
- Validações
- Máscara monetária
- Upload de comprovante (opcional)

**GraficoPorCategoria.tsx**
- Gráfico de pizza
- Cores por categoria
- Percentual de cada categoria
- Tooltip com valor

**ComparativoMensal.tsx**
- Gráfico de barras
- Mês atual vs meses anteriores
- Por categoria
- Tendência

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] CRUD completo funciona
- [ ] Categorias funcionam
- [ ] Gráficos renderizam
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaGestaoFrentistas (#23)

---

**Tempo Estimado:** 5-7 horas
