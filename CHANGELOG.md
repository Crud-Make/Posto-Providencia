# Changelog

## [Não Lançado]

### Refatoração - Fase 1 e 2 (Em Progresso)
- **Issue #7:** Refatoração do componente TelaFechamentoDiario.tsx
  - ✅ Extraídos tipos e constantes para `types/fechamento.ts` (commit 797207f)
    - Tipos renomeados para português: `BicoComDetalhes`, `EntradaPagamento`, `SessaoFrentista`
    - Constantes renomeadas: `CORES_COMBUSTIVEL`, `TURNOS_PADRAO`
    - Documentação JSDoc completa em português
  - ✅ Extraídas funções de formatação para `utils/formatters.ts` (commit 4774a2a)
    - Funções renomeadas: `analisarValor`, `formatarParaBR`, `paraReais`, etc
    - Mantém correção da Issue #3 (comportamento natural de digitação)
  - ✅ Extraídas funções de cálculo para `utils/calculators.ts` (commit 0b3f320)
    - Funções renomeadas: `calcularLitros`, `calcularVenda`, `agruparPorCombustivel`
    - Mantém regra da planilha: fechamento ≤ inicial → mostra "-"
  - ✅ Criado hook `useAutoSave` (commit 4557883)
    - Lógica de localStorage isolada
    - Validação de segurança: só restaura rascunhos da mesma data
  - ✅ Criado hook `useCarregamentoDados` (commit ce6805a)
    - Carregamento paralelo de bicos, frentistas e turnos
    - Realtime subscription do Supabase configurada
  - 🔄 **Próximos passos:** Criar hooks restantes, componentes UI e integrar no componente principal

### Objetivo da Refatoração
- Reduzir TelaFechamentoDiario.tsx de 2667 para ~400 linhas (85% de redução)
- Melhorar manutenibilidade e testabilidade
- Eliminar código duplicado
- Seguir Princípio da Carta Curta (Regra 6.1)

## [Anterior]
- Precisão Decimal e Máscara Monetária corrigidas.
- Perda de dados ao trocar aba do navegador resolvida.
- Cálculo incorreto de encerrantes corrigido.
