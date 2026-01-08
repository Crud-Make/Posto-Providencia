# Issue para criar no GitHub

## Título
Refatoração: Organizar TelaFechamentoDiario.tsx (2667 linhas)

## Descrição (copiar tudo abaixo)

## Contexto

O arquivo `components/TelaFechamentoDiario.tsx` possui **2667 linhas** e está muito desorganizado, concentrando múltiplas responsabilidades em um único componente monolítico.

## Problemas Identificados

1. **Múltiplas responsabilidades**: UI + lógica de negócio + API + estado
2. **Código duplicado**: Formatação, cálculos de totais, handlers repetidos
3. **Complexidade alta**: Funções com 100+ linhas
4. **Testabilidade baixa**: Difícil testar lógica isoladamente
5. **Manutenibilidade comprometida**: Mudanças pequenas requerem navegar 2000+ linhas

## Objetivo

Refatorar o componente seguindo o **Princípio da Carta Curta** (Regra 6.1) - código simples, direto e manutenível, sem over-engineering.

## Estratégia

**Abordagem incremental com commits pequenos:**

### Fase 1: Preparação (tipos e utilitários)
- [ ] Criar `types/fechamento.ts` - Tipos e constantes
- [ ] Criar `utils/formatters.ts` - Funções de formatação
- [ ] Criar `utils/calculators.ts` - Funções de cálculo

### Fase 2: Hooks customizados (lógica de negócio)
- [ ] Criar `hooks/useAutoSave.ts` - Autosave e localStorage
- [ ] Criar `hooks/useReadings.ts` - Gerenciamento de leituras
- [ ] Criar `hooks/usePayments.ts` - Gerenciamento de pagamentos
- [ ] Criar `hooks/useFrentistaSessions.ts` - Sessões de frentistas
- [ ] Criar `hooks/useDataLoading.ts` - Carregamento de dados
- [ ] Criar `hooks/useFechamento.ts` - Cálculos gerais

### Fase 3: Subcomponentes (UI)
- [ ] Criar `components/fechamento/ClosingHeader.tsx` - Header
- [ ] Criar `components/fechamento/FuelReadingsTable.tsx` - Tabela de leituras
- [ ] Criar `components/fechamento/PaymentGrid.tsx` - Grid de pagamentos
- [ ] Criar `components/fechamento/FrentistaDetailTable.tsx` - Tabela de frentistas
- [ ] Criar `components/fechamento/FinancialCharts.tsx` - Gráficos
- [ ] Criar `components/fechamento/ClosingFooter.tsx` - Footer

### Fase 4: Integração
- [ ] Refatorar `components/TelaFechamentoDiario.tsx` (orquestrador)

### Fase 5: Validação
- [ ] Testar em localhost:3015
- [ ] Atualizar CHANGELOG.md

## Resultado Esperado

- Arquivo principal: **2667 → ~400 linhas** (85% de redução)
- 16 arquivos novos bem organizados
- Código mais testável, manutenível e compreensível
- Zero mudanças na funcionalidade (refatoração pura)

## Regras Seguidas

- ✅ Regra 6.1 - Princípio da Carta Curta
- ✅ Regra 2.3 - Commits pequenos e incrementais
- ✅ Regra 4.1 - Proibição de `any`
- ✅ Regra 5.1 - Documentação obrigatória (JSDoc)
- ✅ Regra 1.1 - TODO em Português (Brasil)

---

## Label
refactor

---

## Link para criar
https://github.com/Thyago-vibe/Posto-Providencia/issues/new

## Passos:
1. Abrir o link acima
2. Copiar o texto da "Descrição"
3. Colar no campo de descrição
4. Adicionar label "refactor"
5. Clicar em "Submit new issue"
6. Copiar o número da Issue (ex: #5)
7. Informar o número aqui no chat
