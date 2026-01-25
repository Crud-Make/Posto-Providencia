# PRD-022: Refatoração TelaDashboardProprietario.tsx

> **Issue:** A criar
> **Componente:** `TelaDashboardProprietario.tsx` (599 linhas)
> **Sprint:** 4 (Componente 1/7)
> **Prioridade:** 🔴 Alta
> **Tipo:** LARGE
> **Data:** 11/01/2026

---

## 🎯 1. Objetivo

Modularizar o componente `TelaDashboardProprietario.tsx`, transformando-o em um dashboard estratégico de alta performance. O foco é separar a complexa lógica de agregação de dados (vendas, despesas, dívidas, empréstimos) da camada de apresentação, garantindo manutenibilidade e clareza.

---

## 📊 2. Estado Atual

### 2.1 Análise do Componente
- **Arquivo:** `src/components/TelaDashboardProprietario.tsx`
- **Linhas:** ~599
- **Responsabilidades:**
  - Buscar postos ativos.
  - Calcular vendas do dia e mês (via `fechamentoService`).
  - Calcular dívidas pendentes (query direta Supabase).
  - Calcular empréstimos ativos (query direta Supabase).
  - Calcular despesas pendentes (query direta Supabase).
  - Calcular margem média de combustíveis (query direta Supabase).
  - Exibir cards de resumo (Vendas, Lucro, Dívidas, Equipe).
  - Exibir demonstrativo financeiro (Entradas - Saídas = Resultado).
  - Exibir alertas (embora a lógica de alertas pareça estática/simples no código atual).

### 2.2 Problemas
1. **Lógica de Dados Misturada com UI:** Queries do Supabase dentro do `useEffect`/`loadData`.
2. **Cálculos Manuais:** Reductions e filtros feitos diretamente no render ou no fetch.
3. **Falta de Reutilização:** Lógica de busca de despesas/dívidas poderia ser útil em outros lugares.
4. **UI Monolítica:** Um único arquivo gigante contendo toda a estrutura visual.

---

## 🔧 3. Arquitetura Proposta

### 3.1 Estrutura de Diretórios
```
src/components/dashboard-proprietario/
├── TelaDashboardProprietario.tsx     # Orquestrador (~100 linhas)
│
├── components/
│   ├── ResumoExecutivo.tsx           # Cards do topo (Vendas, Lucro, Dívidas, Equipe)
│   ├── DemonstrativoFinanceiro.tsx   # Seção "Entradas - Saídas = Resultado"
│   ├── AlertasGerenciais.tsx         # Lista de alertas
│   └── FiltrosDashboard.tsx          # Seletor de período (Hoje/Semana/Mês)
│
└── hooks/
    ├── useDashboardProprietario.ts   # Hook principal de dados (agregação)
    └── useCalculosDashboard.ts       # Lógica pura de cálculos (margens, totais)
```

### 3.2 Interfaces (Types)

```typescript
// src/components/dashboard-proprietario/types.ts

export interface ResumoFinanceiro {
  vendas: number;
  lucroEstimado: number;
  dividas: number;
  despesas: number;
  emprestimos: number;
  frentistasAtivos: number;
  margemMedia: number;
}

export interface DadosDashboard {
  hoje: ResumoFinanceiro;
  mes: ResumoFinanceiro;
  posto: {
    id: string;
    nome: string;
  };
  ultimaAtualizacao: string;
}

export type PeriodoFiltro = 'hoje' | 'semana' | 'mes';
```

---

## 📝 4. Especificação dos Hooks

### 4.1 `useDashboardProprietario.ts`
- **Entrada:** `periodo: PeriodoFiltro`
- **Responsabilidade:**
  - Buscar dados de TODAS as fontes em paralelo (`Promise.all`).
  - `fechamentoService.getByDateRange`
  - `despesaService.getPendentes`
  - `dividaService.getPendentes` (se existir, ou query direta encapsulada)
  - Retornar objeto `DadosDashboard` formatado.
  - Gerenciar estados `loading`, `refreshing`, `error`.

### 4.2 `useCalculosDashboard.ts` (Opcional, pode estar dentro do hook principal se for simples)
- Calcular totais e margens.
- Validar consistência (ex: margem não pode ser > 100% ou < 0% sem warning).

---

## 🎨 5. Especificação dos Componentes

### 5.1 `ResumoExecutivo.tsx`
- Recebe `dados: ResumoFinanceiro`.
- Renderiza os 4 cards principais do topo.
- Usa gradientes e ícones conforme design atual.

### 5.2 `DemonstrativoFinanceiro.tsx`
- Recebe `dados: ResumoFinanceiro` (do mês ou período selecionado).
- Layout de 3 colunas: Geração de Caixa | Despesas Operacionais | Resultado Líquido.
- Visualização clara do fluxo: `Receita - Despesa = Lucro`.

### 5.3 `AlertasGerenciais.tsx`
- Exibe alertas de:
  - Margem abaixo do esperado.
  - Dívidas altas.
  - Pendências financeiras críticas.

---

## ✅ 6. Critérios de Aceite
- [ ] UI idêntica ou melhor que a original (respeitar design system).
- [ ] Zero queries Supabase dentro de componentes UI.
- [ ] JSDoc completo em PT-BR.
- [ ] Types rigorosos (sem `any`).
- [ ] Carregamento com Skeleton ou Spinner centralizado.
- [ ] Build de produção sem erros.

