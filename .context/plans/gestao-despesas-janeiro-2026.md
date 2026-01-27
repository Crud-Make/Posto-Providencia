---
title: Gestão de Despesas e Lucro Janeiro 2026
summary: Identificar as despesas de Janeiro/2026 na planilha Excel, processar os totais de taxas, salários e despesas fixas, e cadastrá-las no banco de dados para permitir a visualização do lucro real nos dashboards.
status: in_progress
progress: 100
generated: 2026-01-27
agents:
  - type: "architect-specialist"
    role: "Define a estrutura de mapeamento entre a planilha e a tabela Despesa"
  - type: "feature-developer"
    role: "Implementar scripts de extração e inserção de despesas"
  - type: "frontend-specialist"
    role: "Validar a exibição do lucro real nos dashboards"
lastUpdated: "2026-01-27T11:23:50.010Z"
---

# 📋 Plano: Gestão de Despesas e Lucro Janeiro 2026

## 🎯 Objetivo
Garantir que todas as saídas financeiras de Janeiro/2026 (taxas, salários e custos fixos) estejam registradas no sistema para que o cálculo de lucro líquido seja preciso e reflita a realidade da planilha.

## 🏗️ Fases

### 1. Extração e Auditoria (Current)
- **Tarefa**: Mapear detalhadamente os valores de despesas na planilha `Posto,Jorro, 2026.xlsx`.
- **Ações**:
  - Extrair total de **Salários** do mês 01 (R$ 8.647,76 identificados na linha 1153 da aba "Mes, 01.").
  - Extrair **Despesas Operacionais Fixas** (R$ 14.484,97 identificados na aba "POSTO JORRO 2026").
  - Verificar se existem outras retiradas ou pagamentos avulsos nas abas diárias.

### 2. Registro no Banco de Dados
- **Tarefa**: Inserir os dados na tabela `Despesa`.
- **Ações**:
  - Criar registro de "Folha de Pagamento - Janeiro" (Categoria: `salario`, Valor: 8647.76, Status: `pago`).
  - Criar registro de "Despesas Operacionais - Janeiro" (Categoria: `outros` ou `manutencao`, Valor: 14484.97, Status: `pago`).
  - Garantir que o `posto_id` esteja correto (Posto Jorro).

### 3. Integração e Cálculo de Lucro
- **Tarefa**: Validar as funções SQL que calculam o lucro.
- **Ações**:
  - Revisar a função `get_dashboard_proprietario` para garantir que ela subtraia as despesas cadastradas na tabela `Despesa`.
  - Revisar a função `get_fechamento_mensal` para inclusão proporcional de custos fixos se necessário.

### 4. Validação na Interface
- **Tarefa**: Verificar se os filtros e gráficos mostram os valores corretos.
- **Ações**:
  - Abrir a tela de Gestão de Despesas e verificar os registros criados.
  - Abrir o Dashboard do Proprietário e comparar o "Lucro Líquido" com o cálculo manual da planilha (Vendas - Custo Combustível - Taxas - Despesas).

## 🚀 Critérios de Sucesso
- [ ] Tabela `Despesa` contém todos os registros de Janeiro/2026.
- [ ] Dashboards mostram lucro líquido deduzindo as despesas fixas e salários.
- [ ] O valor total de despesas no sistema bate com a soma `Salários + Desp.Mês` da planilha (Total estimado: R$ 23.132,73).

## 🛡️ Plano de Rollback
- Caso os valores fiquem inconsistentes, os registros de despesa de janeiro podem ser removidos via script de reset ou manualmente pela interface de gestão de despesas.

---
**Branch**: `feat/gestao-despesas-jan2026`
**Responsável**: `feature-developer`

## Execution History

> Last updated: 2026-01-27T11:23:50.010Z | Progress: 100%

### 2 [DONE]
- Started: 2026-01-27T11:22:40.088Z
- Completed: 2026-01-27T11:22:40.088Z

- [x] Step 1: Step 1 *(2026-01-27T11:22:40.088Z)*
  - Output: /home/thygas/.gemini/antigravity/scratch/Posto-Providencia/apps/web/src/components/dashboard-proprietario/hooks/useDashboardProprietario.ts
  - Notes: Despesas cadastradas com sucesso:
- Folha de Pagamento: R$ 10.430,01
- Despesas Operacionais: R$ 14.484,97
Total: R$ 24.914,98

Hook atualizado para buscar despesas do período ao invés de apenas pendentes.

### 3 [DONE]
- Started: 2026-01-27T11:23:50.010Z
- Completed: 2026-01-27T11:23:50.010Z

- [x] Step 1: Step 1 *(2026-01-27T11:23:50.010Z)*
  - Output: /home/thygas/.gemini/antigravity/scratch/Posto-Providencia/apps/web/src/components/dashboard-proprietario/components/DemonstrativoFinanceiro.tsx
  - Notes: Componentes atualizados:
- DemonstrativoFinanceiro.tsx: descrição atualizada para refletir despesas totais do período
- Hook useDashboardProprietario.ts: busca todas as despesas do mês ao invés de apenas pendentes
- Tipos atualizados com campo despesasTotalMes

Sistema agora mostra R$ 24.914,98 em despesas para janeiro/2026.
