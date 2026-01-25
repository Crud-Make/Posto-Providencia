---
title: Plano de Aprimoramento: Detalhamento de Frentistas Web
status: in_progress
generated: 2026-01-25
agents:
  - type: "frontend-specialist"
    role: "Responsável pela UI e integração com hooks de dados"
  - type: "architect-specialist"
    role: "Define o contrato de dados e padrões de integração monorepo"
  - type: "code-reviewer"
    role: "Garante a qualidade do código e adesão ao CLAUDE.md"
---

# 📋 Detalhamento Frentistas Enhancement Plan

## 🎯 Goals and Scope

Transformar a aba de "Detalhamento Frentistas" em uma ferramenta robusta de conciliação, inspirada no design premium de dashboards financeiros.

- **Design Premium**: Implementar visual dark-mode com gradientes, glassmorphism e tipografia Inter, conforme inspiração enviada pelo usuário.
- **Integração Real-time**: Puxar automaticamente as submissões feitas via app mobile.
- **Conciliação Inteligente**: Comparar valores declarados (mobile) vs esperado (leituras de bomba).
- **Padronização Monorepo**: Usar 100% `@posto/types` e `@posto/utils`.
- **UX Avançada**: Tabela dinâmica com frentistas em colunas e meios de pagamento em linhas, incluindo tooltips de detalhes e alertas de divergências.

## 🏗️ Execution Phases

### Phase 1: Estabilização e Design (P/R)
- **Goal**: Definir o layout e os tokens de design.
- **Steps**:
  1. Analisar `TabDetalhamentoFrentista.tsx` e `TabelaFrentistas.tsx` existentes.
  2. Criar os novos subcomponentes de UI baseados no HTML de inspiração (`CardMetrica`, `TabelaConciliacao`).
  3. Garantir que as cores (Primary: #8B5CF6, Secondary: #10B981) estejam no tema.
- **Deliverables**: Novos componentes de UI puramente visuais.
- **Checkpoint**: `git commit -m "design: novos componentes de UI para detalhamento de frentistas"`

### Phase 2: Lógica de Integração e Hooks (E)
- **Goal**: Implementar a lógica de busca e merge de dados.
- **Steps**:
  1. Refatorar `useFechamento.ts` para integrar dados de `FechamentoFrentista` (mobile).
  2. Implementar lógica de comparação (Diferença = Real - Esperado).
  3. Usar tipos do `@posto/types` para garantir consistência.
- **Deliverables**: Hook `useConciliacaoFrentistas` ou similar.
- **Checkpoint**: `git commit -m "feat: lógica de conciliação mobile integrada ao hook"`

### Phase 3: Implementação da Tela (E)
- **Goal**: Montar a tela final e integrar funcionalidades.
- **Steps**:
  1. Substituir a tabela antiga pela nova estrutura de colunas dinâmicas (Frentistas).
  2. Adicionar os cards de resumo no topo (Vendas Totais, Ticket Médio, Lucro Total, Melhor Vendedor).
  3. Implementar o modal de "Comparativo de Bicos" (se pertinente a esta tela) ou manter foco no fechamento.
- **Deliverables**: Aba "Detalhamento Frentistas" 100% funcional.
- **Checkpoint**: `git commit -m "feat(web): tela de detalhamento frentistas aprimorada"`

### Phase 4: Validação e Finalização (V)
- **Goal**: Garantir que o fechamento é salvo corretamente.
- **Steps**:
  1. Testar salvamento total do fechamento.
  2. Validar responsividade e dark mode.
- **Deliverables**: Relatório de validação positivo.
- **Checkpoint**: `git commit -m "test: validação final do fechamento de frentistas"`

## 👨‍💻 Agent Lineup
- **architect-specialist**: Desenha o fluxo de conciliação e contratos de tipos.
- **frontend-specialist**: Implementa a UI premium e lógica de componentes.

## ✅ Success Criteria
- [ ] Dados mobile aparecem na web instantaneamente.
- [ ] Colunas dinâmicas por frentista (Barbara, Elyon, Felipe, etc) conforme design sugerido.
- [ ] Alertas visuais de divergências (verde para OK, vermelho para erro).
- [ ] Estilo visual condizente com o dashboard financeiro moderno (Inter, gradientes).
