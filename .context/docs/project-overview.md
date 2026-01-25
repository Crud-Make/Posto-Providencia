---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-01-25
status: filled
scaffoldVersion: "2.0.0"
---

# Posto Providência - Sistema de Gestão

## Visão Geral

Sistema completo de gestão para postos de combustível, desenvolvido em monorepo com React (Web) e React Native (Mobile).

## Stack Tecnológica

- **Frontend Web**: React + TypeScript + Vite + TailwindCSS
- **Mobile**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Monorepo**: Turborepo + Bun
- **Gráficos**: Recharts
- **Validação**: Zod

## Módulos Principais

### 1. Fechamento de Caixa
- Leituras de bombas (encerrantes)
- Gestão de bicos e combustíveis
- Detalhamento por frentista
- Financeiro (formas de pagamento)
- **Novo**: Dashboard de Fechamento Mensal com:
  - KPIs (Lucro, Volume, Faturamento, Projeções)
  - Gráficos de evolução diária
  - Mix de combustíveis
  - Auditoria de encerrantes (início vs fim do mês)

### 2. Gestão de Estoque
- Controle de entrada/saída
- Alertas de estoque baixo
- Histórico de movimentações

### 3. Análise de Vendas
- Dashboard de vendas
- Análise de rentabilidade
- Evolução temporal

### 4. Gestão de Frentistas
- Cadastro e escalas
- Histórico de desempenho
- Conciliação de vendas

### 5. Financeiro
- Despesas e receitas
- Análise de custos
- Relatórios gerenciais

## Arquitetura

```
Posto-Providencia/
├── apps/
│   ├── web/          # React Web App
│   └── mobile/       # React Native App
├── packages/
│   ├── types/        # TypeScript types compartilhados
│   ├── utils/        # Utilitários compartilhados
│   └── api-core/     # Core API logic
└── supabase_migrations/  # Migrations SQL
```

## Funcionalidades Recentes (Jan 2026)

- ✅ Dashboard de Fechamento Mensal
- ✅ Auditoria de encerrantes
- ✅ Gráficos interativos (Recharts)
- ✅ Projeções automáticas de lucro/volume
- ✅ Tabela de conciliação de frentistas

## Padrões de Código

- TypeScript strict mode (zero `any`)
- Clean Code (SOLID/DRY)
- JSDoc obrigatório
- Commits semânticos em PT-BR
- Rastreio de mudanças com comentários datados
