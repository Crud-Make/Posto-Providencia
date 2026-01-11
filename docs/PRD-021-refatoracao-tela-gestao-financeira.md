# PRD-021: Refatoração TelaGestaoFinanceira.tsx

> **Issue:** A criar (#21)
> **Componente:** `TelaGestaoFinanceira.tsx` (604 linhas)
> **Status:** 📋 Planejamento
> **Data:** 11/01/2026
> **Sprint:** Sprint 3 - Componente 3/3

---

## 🎯 1. Objetivo

Modularizar o componente `TelaGestaoFinanceira.tsx` (604 linhas) seguindo o padrão estabelecido nas Issues #19 (TelaRegistroCompras) e #20 (TelaGestaoEscalas), criando uma estrutura organizada de hooks e componentes especializados para gestão financeira consolidada.

---

## 📊 2. Estado Atual

### 2.1 Análise do Componente

**Arquivo:** `src/components/TelaGestaoFinanceira.tsx`
- **Linhas:** 604
- **Tamanho:** ~34 KB
- **Complexidade:** 🟡 Média-Alta

### 2.2 Responsabilidades Identificadas

1. **Gestão de Estado Financeiro**
   - Período selecionado (data início/fim)
   - Filtros (tipo de transação, categoria)
   - Dados agregados (receitas, despesas, lucro)

2. **Visualização de Dados**
   - Resumo financeiro (cards de métricas)
   - Gráfico de fluxo de caixa (área/linha)
   - Tabela de transações
   - Indicadores de performance

3. **Cálculos Financeiros**
   - Total de receitas
   - Total de despesas
   - Lucro líquido
   - Margem de lucro
   - Projeções (se houver)

4. **Integração com API**
   - Buscar vendas do período
   - Buscar despesas do período
   - Buscar recebimentos
   - Agregar dados financeiros

### 2.3 Problemas Identificados

| Problema | Severidade | Impacto |
|----------|------------|---------|
| Arquivo monolítico (604 linhas) | 🟡 Média | Dificulta manutenção |
| Lógica de cálculo misturada com UI | 🟡 Média | Impossível testar isoladamente |
| Múltiplas responsabilidades | 🟡 Média | Viola SRP |
| Código duplicado com outros dashboards | 🟡 Média | Aumenta dívida técnica |

---

## 🏗️ 3. Arquitetura Proposta

### 3.1 Estrutura de Diretórios

```
src/components/financeiro/
├── TelaGestaoFinanceira.tsx          # Orquestrador (~100-120 linhas)
│
├── components/
│   ├── ResumoFinanceiro.tsx          # Cards de métricas (~150 linhas)
│   ├── GraficoFluxoCaixa.tsx         # Gráfico principal (~180 linhas)
│   ├── TabelaTransacoes.tsx          # Lista de transações (~200 linhas)
│   ├── FiltrosFinanceiros.tsx        # Filtros de período/tipo (~120 linhas)
│   └── IndicadoresPerformance.tsx    # KPIs adicionais (~100 linhas)
│
└── hooks/
    ├── useFinanceiro.ts              # Dados financeiros agregados (~150 linhas)
    ├── useFluxoCaixa.ts              # Cálculos de fluxo (~120 linhas)
    └── useFiltrosFinanceiros.ts      # Estado de filtros (~80 linhas)
```

**Total:** 10 arquivos (~1.200 linhas organizadas)

### 3.2 Fluxo de Dados

```
TelaGestaoFinanceira (Orquestrador)
    ↓
    ├── useFiltrosFinanceiros() → Estado de filtros
    ├── useFinanceiro(filtros) → Dados agregados
    └── useFluxoCaixa(dados) → Cálculos
    ↓
    ├── FiltrosFinanceiros
    ├── ResumoFinanceiro
    ├── GraficoFluxoCaixa
    ├── TabelaTransacoes
    └── IndicadoresPerformance
```

---

## 🔧 4. Especificação Técnica

### 4.1 Hooks Customizados

#### 4.1.1 `useFinanceiro.ts`

**Responsabilidade:** Buscar e agregar dados financeiros

```typescript
/**
 * Hook para gerenciamento de dados financeiros consolidados.
 *
 * Busca vendas, despesas, recebimentos e compras do período selecionado,
 * agregando em métricas consolidadas de receita, despesa e lucro.
 *
 * @param filtros - Período e filtros aplicados
 * @returns Dados financeiros agregados e estado de carregamento
 *
 * @example
 * const { dados, carregando, recarregar } = useFinanceiro({
 *   dataInicio: '2026-01-01',
 *   dataFim: '2026-01-31'
 * });
 */
interface UseFinanceiroParams {
  dataInicio: string;
  dataFim: string;
  postoId?: number;
}

interface UseFinanceiroReturn {
  dados: DadosFinanceiros;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

interface DadosFinanceiros {
  receitas: {
    total: number;
    vendas: number;
    recebimentos: number;
  };
  despesas: {
    total: number;
    operacionais: number;
    compras: number;
  };
  lucro: {
    bruto: number;
    liquido: number;
    margem: number; // Percentual
  };
  transacoes: Transacao[];
}
```

**Funcionalidades:**
- ✅ Buscar vendas do período (leituraService)
- ✅ Buscar despesas do período (despesaService)
- ✅ Buscar recebimentos (recebimentoService)
- ✅ Buscar compras (compraService)
- ✅ Agregar dados em métricas consolidadas
- ✅ Calcular lucro bruto e líquido
- ✅ Calcular margem de lucro

#### 4.1.2 `useFluxoCaixa.ts`

**Responsabilidade:** Calcular fluxo de caixa para gráfico

```typescript
/**
 * Hook para cálculo de fluxo de caixa diário/mensal.
 *
 * Processa os dados financeiros e gera séries temporais
 * para visualização em gráfico de fluxo de caixa.
 *
 * @param dados - Dados financeiros consolidados
 * @param granularidade - 'diario' | 'semanal' | 'mensal'
 * @returns Séries de dados para gráfico
 *
 * @example
 * const { series, totais } = useFluxoCaixa(dados, 'diario');
 */
interface UseFluxoCaixaReturn {
  series: SerieFluxoCaixa[];
  totais: {
    entradas: number;
    saidas: number;
    saldo: number;
  };
}

interface SerieFluxoCaixa {
  data: string;
  receitas: number;
  despesas: number;
  saldo: number;
}
```

**Cálculos:**
- ✅ Agrupar transações por dia/semana/mês
- ✅ Calcular saldo acumulado
- ✅ Gerar séries para gráfico
- ✅ Calcular médias móveis (opcional)

#### 4.1.3 `useFiltrosFinanceiros.ts`

**Responsabilidade:** Gerenciar estado de filtros

```typescript
/**
 * Hook para gerenciamento de filtros financeiros.
 *
 * Controla período selecionado, tipos de transação e outras
 * opções de filtro da tela financeira.
 *
 * @returns Estado e funções de manipulação de filtros
 *
 * @example
 * const { filtros, atualizar, resetar } = useFiltrosFinanceiros();
 */
interface UseFiltrosFinanceirosReturn {
  filtros: FiltrosFinanceiros;
  atualizar: (campo: keyof FiltrosFinanceiros, valor: any) => void;
  resetar: () => void;
  aplicarPreset: (preset: 'hoje' | 'semana' | 'mes' | 'ano') => void;
}

interface FiltrosFinanceiros {
  dataInicio: string;
  dataFim: string;
  tipoTransacao?: 'receita' | 'despesa' | 'todas';
  categoria?: string;
}
```

---

### 4.2 Componentes UI

#### 4.2.1 `ResumoFinanceiro.tsx`

**Responsabilidade:** Cards de métricas principais

**Props:**
```typescript
interface ResumoFinanceiroProps {
  dados: DadosFinanceiros;
  carregando?: boolean;
}
```

**Layout:**
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   Receitas  │   Despesas  │    Lucro    │   Margem    │
│   R$ XXX    │   R$ XXX    │   R$ XXX    │    XX%      │
│   ▲ +5.2%   │   ▼ -2.1%   │   ▲ +8.3%   │   ▲ +1.2%   │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

**Features:**
- ✅ 4 cards principais
- ✅ Variação percentual vs período anterior
- ✅ Cores semânticas (verde/vermelho)
- ✅ Loading skeleton

#### 4.2.2 `GraficoFluxoCaixa.tsx`

**Responsabilidade:** Gráfico de área/linha do fluxo

**Props:**
```typescript
interface GraficoFluxoCaixaProps {
  series: SerieFluxoCaixa[];
  granularidade: 'diario' | 'semanal' | 'mensal';
  altura?: number;
}
```

**Tipo de Gráfico:**
- Área empilhada (receitas vs despesas)
- Linha de saldo acumulado
- Recharts como biblioteca

**Features:**
- ✅ Tooltip customizado
- ✅ Zoom/Pan (opcional)
- ✅ Export para imagem
- ✅ Responsive

#### 4.2.3 `TabelaTransacoes.tsx`

**Responsabilidade:** Lista detalhada de transações

**Props:**
```typescript
interface TabelaTransacoesProps {
  transacoes: Transacao[];
  onDetalhes?: (transacao: Transacao) => void;
  carregando?: boolean;
}
```

**Colunas:**
- Data
- Tipo (Receita/Despesa)
- Categoria
- Descrição
- Valor
- Ações

**Features:**
- ✅ Ordenação por coluna
- ✅ Paginação (20 itens/página)
- ✅ Filtro inline
- ✅ Export CSV

#### 4.2.4 `FiltrosFinanceiros.tsx`

**Responsabilidade:** Barra de filtros

**Props:**
```typescript
interface FiltrosFinanceirosProps {
  filtros: FiltrosFinanceiros;
  onAplicar: (filtros: FiltrosFinanceiros) => void;
}
```

**Elementos:**
- DatePicker de período
- Select de tipo (Receita/Despesa/Todas)
- Select de categoria
- Botões de preset (Hoje, Semana, Mês, Ano)
- Botão Limpar

#### 4.2.5 `IndicadoresPerformance.tsx`

**Responsabilidade:** KPIs adicionais

**Props:**
```typescript
interface IndicadoresPerformanceProps {
  dados: DadosFinanceiros;
}
```

**Indicadores:**
- Ticket médio
- ROI (Return on Investment)
- Despesas/Receita ratio
- Projeção fim do mês

---

### 4.3 Orquestrador Principal

#### `TelaGestaoFinanceira.tsx`

**Responsabilidade:** Coordenar hooks e componentes

```typescript
/**
 * Tela de Gestão Financeira Consolidada.
 *
 * Exibe visão completa da situação financeira do posto,
 * com receitas, despesas, lucro e fluxo de caixa.
 *
 * @returns Componente da tela
 */
const TelaGestaoFinanceira: React.FC = () => {
  const { filtros, atualizar, aplicarPreset } = useFiltrosFinanceiros();
  const { dados, carregando, recarregar } = useFinanceiro(filtros);
  const { series, totais } = useFluxoCaixa(dados, 'diario');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Gestão Financeira</h1>

      <FiltrosFinanceiros
        filtros={filtros}
        onAplicar={atualizar}
      />

      <ResumoFinanceiro
        dados={dados}
        carregando={carregando}
      />

      <GraficoFluxoCaixa
        series={series}
        granularidade="diario"
      />

      <IndicadoresPerformance dados={dados} />

      <TabelaTransacoes
        transacoes={dados.transacoes}
        carregando={carregando}
      />
    </div>
  );
};
```

**Linhas estimadas:** ~100-120 (redução de 83%)

---

## 📐 5. Tipos e Interfaces

```typescript
/**
 * Representa uma transação financeira (receita ou despesa).
 */
interface Transacao {
  readonly id: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  descricao: string;
  valor: number;
  data: string;
  origem: 'venda' | 'recebimento' | 'despesa' | 'compra';
}

/**
 * Dados financeiros consolidados de um período.
 */
interface DadosFinanceiros {
  receitas: {
    total: number;
    vendas: number;
    recebimentos: number;
  };
  despesas: {
    total: number;
    operacionais: number;
    compras: number;
  };
  lucro: {
    bruto: number;
    liquido: number;
    margem: number;
  };
  transacoes: Transacao[];
}

/**
 * Filtros aplicáveis à visualização financeira.
 */
interface FiltrosFinanceiros {
  dataInicio: string;
  dataFim: string;
  tipoTransacao?: 'receita' | 'despesa' | 'todas';
  categoria?: string;
}

/**
 * Ponto de dados para série temporal de fluxo de caixa.
 */
interface SerieFluxoCaixa {
  data: string;
  receitas: number;
  despesas: number;
  saldo: number;
}
```

---

## 📋 6. Plano de Implementação

### Fase 1: Preparação (30min)
1. Criar branch `refactor/tela-gestao-financeira`
2. Criar estrutura de diretórios
3. Analisar componente atual

### Fase 2: Hooks (3-4h)
1. `useFiltrosFinanceiros.ts` - Estado de filtros
2. `useFinanceiro.ts` - Agregação de dados
3. `useFluxoCaixa.ts` - Cálculos de fluxo

**Checkpoint:** Testar hooks isoladamente

### Fase 3: Componentes UI (3-4h)
1. `FiltrosFinanceiros.tsx` - Barra de filtros
2. `ResumoFinanceiro.tsx` - Cards de métricas
3. `GraficoFluxoCaixa.tsx` - Gráfico principal
4. `TabelaTransacoes.tsx` - Lista de transações
5. `IndicadoresPerformance.tsx` - KPIs

**Checkpoint:** Testar componentes isoladamente

### Fase 4: Integração (1-2h)
1. Refatorar `TelaGestaoFinanceira.tsx`
2. Integrar hooks e componentes
3. Testes manuais completos
4. Validar cálculos

**Checkpoint:** Build sem erros, funcionalidade 100%

### Fase 5: Documentação (30min)
1. JSDoc em todos os arquivos
2. Atualizar CHANGELOG.md
3. Atualizar PLANO-REFATORACAO-COMPLETO.md

### Fase 6: Finalização (30min)
1. Commit e Push
2. Criar Pull Request
3. Aguardar CI

---

## ✅ 7. Critérios de Aceite

### Funcionalidade
- [ ] Filtros de período funcionam corretamente
- [ ] Métricas calculam corretamente (receita, despesa, lucro)
- [ ] Gráfico renderiza com dados corretos
- [ ] Tabela de transações exibe todos os dados
- [ ] Paginação funciona
- [ ] Export funciona (se implementado)

### Qualidade de Código
- [ ] Componente principal <150 linhas
- [ ] Cada hook <150 linhas
- [ ] Cada componente UI <250 linhas
- [ ] Zero uso de `any`
- [ ] JSDoc completo em português
- [ ] Tipos TypeScript para todas as interfaces

### Build e Testes
- [ ] `bun run build` sem erros
- [ ] `bun run dev` sem warnings
- [ ] Testes manuais em localhost:3015 passam
- [ ] Zero breaking changes

### Documentação
- [ ] CHANGELOG.md atualizado
- [ ] PLANO-REFATORACAO-COMPLETO.md atualizado
- [ ] Comentários claros em lógica complexa

---

## 📊 8. Métricas de Sucesso

| Métrica | Antes | Meta | Benefício |
|---------|-------|------|-----------|
| Linhas arquivo principal | 604 | <150 | -75% |
| Número de arquivos | 1 | 10 | Modularização |
| Responsabilidades por arquivo | 4+ | 1-2 | SRP |
| Testabilidade | Difícil | Fácil | Qualidade |
| Documentação | 0% | 100% | Manutenibilidade |

---

## ⚠️ 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Cálculos incorretos | Baixa | Crítico | Validar fórmulas com planilha |
| Performance do gráfico | Média | Médio | Limitar pontos de dados, usar memo |
| Breaking changes | Baixa | Alto | Testes manuais extensivos |

---

## 📚 10. Referências

- **Exemplo completo:** `src/components/registro-compras/`
- **Hooks de exemplo:** `src/hooks/registro-compras/`
- **Regras:** [CLAUDE.md](../CLAUDE.md)
- **PRD anterior:** [PRD-018](./PRD-018-refatoracao-tela-registro-compras.md)
- **Recharts:** https://recharts.org/

---

## 🎯 11. Próximos Passos

Após conclusão deste PRD:

1. ✅ Criar Issue #21 no GitHub
2. ✅ Iniciar implementação
3. ✅ **Sprint 3 COMPLETA** 🎉
4. ⏳ Avaliação de próximas refatorações

---

## 📅 12. Cronograma Estimado

- **Preparação:** 30min
- **Hooks:** 3-4h
- **Componentes UI:** 3-4h
- **Integração/Testes:** 1-2h
- **Documentação:** 30min
- **Finalização:** 30min

**Total:** 8-12 horas

---

**Status:** 📋 Planejamento Completo
**Pronto para:** Implementação
**Prioridade:** 🔴 Alta (Sprint 3 - Componente 3/3)
**Estimativa:** 8-12 horas
