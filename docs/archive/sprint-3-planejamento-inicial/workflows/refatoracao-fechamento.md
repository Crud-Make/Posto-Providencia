---
description: Refatoração incremental do TelaFechamentoDiario.tsx (Issue #7)
---

# Refatoração do TelaFechamentoDiario.tsx

> **ATENÇÃO:** Esta refatoração DEVE ser feita peça por peça, validando em localhost:3015 após CADA mudança.

## Contexto

O arquivo `components/TelaFechamentoDiario.tsx` possui ~2500 linhas e precisa ser modularizado usando hooks e componentes já criados nas pastas:
- `hooks/` (useAutoSave, useCarregamentoDados, useLeituras, usePagamentos, useSessoesFrentistas, useFechamento)
- `utils/` (formatters.ts, calculators.ts)
- `types/` (fechamento.ts)
- `components/fechamento/` (SecaoLeituras, SecaoPagamentos, etc.)

## Regras Obrigatórias

1. **Commits pequenos:** 1 mudança = 1 commit
2. **Validação:** Após CADA mudança, verificar em localhost:3015 que a tela funciona
3. **Build:** Verificar `npm run build` passa antes de commitar
4. **Nunca remover código de UI (JSX)** sem entender onde será substituído
5. **Mensagens de commit:** Usar formato `refactor: <descrição> (#7)`

## Fases da Refatoração

### Fase 1: Utilitários e Tipos ✅ (Já feito)
- [x] Importar `analisarValor`, `formatarParaBR` de `utils/formatters`
- [x] Importar `BicoComDetalhes`, `EntradaPagamento` de `types/fechamento`
- [x] Importar `CORES_COMBUSTIVEL`, `CORES_GRAFICO_*` de `types/fechamento`
- [x] Criar aliases `parseValue = analisarValor` para compatibilidade

### Fase 2: Hook useCarregamentoDados
**O que faz:** Carrega bicos, frentistas e turnos do banco

**Como integrar:**
```typescript
// ANTES (dentro do componente):
const [bicos, setBicos] = useState<BicoComDetalhes[]>([]);
const [frentistas, setFrentistas] = useState<Frentista[]>([]);
const [turnos, setTurnos] = useState<Turno[]>([]);
// + função loadData() com ~50 linhas

// DEPOIS:
import { useCarregamentoDados } from '../hooks/useCarregamentoDados';

const {
   bicos,
   frentistas,
   turnos,
   carregando: loadingDados,
   carregarDados
} = useCarregamentoDados(postoAtivoId);
```

**Validação:** Tabela de bicos DEVE aparecer com os valores iniciais

### Fase 3: Hook useLeituras
**O que faz:** Gerencia leituras de encerrantes (inicial/fechamento)

**Como integrar:**
```typescript
// ANTES:
const [leituras, setLeituras] = useState<Record<number, {...}>>({});
// + handleInicialChange, handleFechamentoChange, calcLitros, calcVenda (~100 linhas)

// DEPOIS:
import { useLeituras } from '../hooks/useLeituras';

const {
   leituras,
   alterarInicial,
   alterarFechamento,
   aoSairInicial,
   aoSairFechamento,
   calcLitros,
   calcVenda,
   totals
} = useLeituras(postoAtivoId, selectedDate, selectedTurno, bicos);
```

**Validação:** Campos de inicial e fechamento devem funcionar, cálculo de litros correto

### Fase 4: Hook usePagamentos
**O que faz:** Gerencia formas de pagamento e cálculo de taxas

**Como integrar:**
```typescript
// ANTES:
const [payments, setPayments] = useState<EntradaPagamento[]>([]);
// + handlePaymentChange, totalLiquido, totalTaxas

// DEPOIS:
import { usePagamentos } from '../hooks/usePagamentos';

const {
   pagamentos: payments,
   totalLiquido,
   totalTaxas,
   alterarPagamento,
   aoSairPagamento
} = usePagamentos(postoAtivoId);
```

**Validação:** Aba "Fechamento Financeiro" deve funcionar

### Fase 5: Hook useSessoesFrentistas
**O que faz:** Gerencia sessões dos frentistas (adicionar/remover/editar)

**Como integrar:**
```typescript
// ANTES:
const [frentistaSessions, setFrentistaSessions] = useState<FrentistaSession[]>([]);
// + handleAddFrentista, updateFrentistaSession, loadFrentistaSessions (~80 linhas)

// DEPOIS:
import { useSessoesFrentistas } from '../hooks/useSessoesFrentistas';

const {
   sessoes: frentistaSessions,
   adicionarFrentista,
   removerFrentista,
   atualizarSessao,
   carregarSessoes
} = useSessoesFrentistas(postoAtivoId);
```

**Validação:** Seção "Detalhamento por Frentista" deve funcionar

### Fase 6: Hook useAutoSave
**O que faz:** Salva/restaura rascunho no localStorage

**Como integrar:**
```typescript
// ANTES:
const [restored, setRestored] = useState(false);
const AUTOSAVE_KEY = useMemo(() => ...);
// + 2 useEffects para save/restore (~50 linhas)

// DEPOIS:
import { useAutoSave } from '../hooks/useAutoSave';

const { restaurado, limparAutoSave } = useAutoSave({
   postoId: postoAtivoId,
   dataSelecionada: selectedDate,
   turnoSelecionado: selectedTurno,
   leituras,
   sessoesFrentistas: frentistaSessions,
   carregando: loading,
   salvando: saving
});
```

**Validação:** Página deve restaurar dados ao recarregar

## Checklist Pós-Refatoração

- [ ] Build passa (`npm run build`)
- [ ] Tabela de bicos aparece com valores
- [ ] Campos de encerrante (inicial/fechamento) funcionam
- [ ] Cálculo de litros e R$ está correto
- [ ] Aba financeiro mostra formas de pagamento
- [ ] Frentistas podem ser adicionados/removidos
- [ ] Rascunho é salvo automaticamente
- [ ] CHANGELOG.md atualizado

## Resultado Esperado

- **Antes:** ~2500 linhas em 1 arquivo
- **Depois:** ~800 linhas (componente orquestrador) + hooks modulares
