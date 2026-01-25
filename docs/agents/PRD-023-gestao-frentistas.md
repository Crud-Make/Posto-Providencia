# PRD-023: Refatoração TelaGestaoFrentistas.tsx

> **Issue:** A criar
> **Componente:** `TelaGestaoFrentistas.tsx` (~546 linhas)
> **Sprint:** 4 (Componente 2/7)
> **Prioridade:** 🔴 Alta

---

## 🎯 Objetivo

Modularizar a tela de gestão de frentistas, separando CRUD, gestão de escalas e análise de desempenho em componentes e hooks especializados.

---

## 📊 Estrutura Proposta

```
src/components/frentistas/
├── TelaGestaoFrentistas.tsx          # ~100 linhas
│
├── components/
│   ├── TabelaFrentistas.tsx          # Lista com ações (~150 linhas)
│   ├── FormFrentista.tsx             # Form de cadastro (~120 linhas)
│   ├── CardDesempenho.tsx            # Métricas (~80 linhas)
│   └── HistoricoAtividades.tsx       # Log (~100 linhas)
│
└── hooks/
    ├── useFrentistas.ts              # CRUD (~150 linhas)
    ├── useDesempenhoFrentista.ts     # Métricas (~100 linhas)
    └── useEscalasFrentista.ts        # Gestão de turnos (~80 linhas)
```

---

## 🔍 Responsabilidades dos Módulos

### Hooks

**useFrentistas.ts**
- Buscar lista de frentistas
- Criar novo frentista
- Atualizar frentista
- Deletar frentista (soft delete)
- Validações de CPF, telefone, etc.

**useDesempenhoFrentista.ts**
- Calcular vendas por frentista
- Calcular média de vendas
- Calcular taxa de erro (diferenças de caixa)
- Ranking de performance

**useEscalasFrentista.ts**
- Buscar escalas/turnos
- Atribuir frentista a escala
- Verificar conflitos de horário
- Calcular horas trabalhadas

### Componentes

**TabelaFrentistas.tsx**
- Colunas: Nome, CPF, Telefone, Status, Ações
- Ordenação por coluna
- Botões: Editar, Deletar, Ver Desempenho
- Filtro por status (ativo/inativo)

**FormFrentista.tsx**
- Campos: Nome, CPF, RG, Telefone, Email
- Validações em tempo real
- Máscara para CPF e telefone
- Botões: Salvar, Cancelar

**CardDesempenho.tsx**
- Vendas do mês
- Média diária
- Taxa de erro
- Badge de ranking

**HistoricoAtividades.tsx**
- Últimas atividades
- Data, tipo de ação, detalhes
- Paginação

---

## ✅ Critérios de Aceite

- [ ] Componente principal <150 linhas
- [ ] CRUD completo funcionando
- [ ] Validações de CPF/telefone
- [ ] Máscara monetária correta
- [ ] Zero `any`
- [ ] JSDoc em português
- [ ] Build sem erros

---

## 📚 Referência

**Padrão:** Similar ao TelaGestaoClientes (#15)
**Arquivo de exemplo:** `src/components/clientes/`

---

**Tempo Estimado:** 7-9 horas
