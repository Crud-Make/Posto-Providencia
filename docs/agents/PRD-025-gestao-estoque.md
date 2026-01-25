# PRD-025: Refatoração TelaGestaoEstoque.tsx

> **Issue:** A criar
> **Componente:** `TelaGestaoEstoque.tsx` (~528 linhas)
> **Sprint:** 4 (Componente 4/7)
> **Prioridade:** 🔴 Alta

---

## 🎯 Objetivo

Modularizar gestão de estoque, separando controle de tanques, movimentações e alertas em componentes especializados.

---

## 📊 Estrutura Proposta

```
src/components/estoque/
├── TelaGestaoEstoque.tsx             # ~100 linhas
│
├── components/
│   ├── TabelaEstoque.tsx             # Lista produtos (~120 linhas)
│   ├── FormMovimentacao.tsx          # Registro entrada/saída (~150 linhas)
│   ├── CardTanque.tsx                # Status de tanque (~100 linhas)
│   └── HistoricoMovimentacoes.tsx    # Log completo (~130 linhas)
│
└── hooks/
    ├── useEstoque.ts                 # Estado de estoque (~150 linhas)
    ├── useMovimentacoes.ts           # Entradas/Saídas (~120 linhas)
    └── useAlertas.ts                 # Alertas (~80 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useEstoque.ts**
- Buscar produtos e estoque atual
- Buscar tanques e níveis
- Calcular capacidade disponível
- Sincronizar com leituras

**useMovimentacoes.ts**
- Registrar entrada (compra)
- Registrar saída (venda)
- Ajuste manual
- Validar movimentação vs capacidade
- Atualizar custo médio

**useAlertas.ts**
- Detectar estoque baixo (<20%)
- Detectar estoque crítico (<10%)
- Alertas de inconsistência (físico vs livro)
- Notificações de ruptura

### Componentes

**TabelaEstoque.tsx**
- Colunas: Produto, Estoque Atual, Capacidade, %
- Indicador visual de nível (barra)
- Cor por status (verde/amarelo/vermelho)
- Botão: Nova Movimentação

**FormMovimentacao.tsx**
- Tipo: Entrada/Saída/Ajuste
- Produto (select)
- Quantidade (litros)
- Motivo (textarea)
- Data/hora
- Validações

**CardTanque.tsx**
- Nome do tanque
- Combustível
- Nível atual (litros)
- Capacidade total
- Gauge visual
- Status (OK/Alerta/Crítico)

**HistoricoMovimentacoes.tsx**
- Últimas 50 movimentações
- Data, Tipo, Produto, Quantidade, Usuário
- Filtro por tipo e período
- Paginação

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] CRUD de movimentações funciona
- [ ] Alertas funcionam corretamente
- [ ] Sincronização com tanques OK
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaRegistroCompras (#19)
**Arquivo de exemplo:** `src/components/registro-compras/`

---

**Tempo Estimado:** 7-9 horas
