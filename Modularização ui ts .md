# PRD-012: Modularização do ui.ts

> **Versão:** 1.0  
> **Data:** 10/01/2026  
> **Issue:** #12  
> **Autor:** Thyago  
> **Status:** Em Análise  
> **Dependências:** PRD-011 (Modularização database.ts)

---

## 1. Resumo Executivo

### 1.1 Problema
O arquivo `src/types/ui.ts` possui **406 linhas** e **9 KB**, contendo tipos de UI misturados sem organização clara por domínio. Dificulta navegação e manutenção.

### 1.2 Solução Proposta
Modularizar o arquivo `ui.ts` em uma estrutura organizada por categoria de componente (Dashboard, Forms, Tables, Charts, Common), mantendo compatibilidade total com código existente.

### 1.3 Benefícios Esperados
- ✅ Redução de 80% no tamanho de cada arquivo individual
- ✅ Navegação mais rápida e eficiente
- ✅ Melhor organização de tipos por categoria
- ✅ Imports mais específicos e claros
- ✅ Facilita adição de novos tipos
- ✅ Completa 100% da refatoração de types

---

## 2. Contexto e Motivação

### 2.1 Estado Atual

| Métrica | Valor Atual | Problema | Meta |
|---------|-------------|----------|------|
| Linhas de código | 406 | Difícil navegar | ~50-80 por arquivo |
| Tamanho do arquivo | 9 KB | Misturado | ~1-2 KB por arquivo |
| Categorias | Todas juntas | Sem organização | 1 categoria por arquivo |
| Imports | Genéricos | Pouco específicos | Por categoria |

### 2.2 Tipos Identificados

Análise do arquivo ui.ts revela os seguintes grupos:

#### **Dashboard Types**
- FuelData
- PaymentData
- ClosingData
- PerformanceData
- AttendantClosing
- AttendantPerformance
- KPIs

#### **Form Types**
- FormField
- FormSection
- ValidationRule
- FormState

#### **Table Types**
- TableColumn
- TableRow
- TableSort
- TableFilter
- PaginationConfig

#### **Chart Types**
- ChartData
- ChartConfig
- ChartSeries
- ChartAxis

#### **Common Types**
- Status
- Priority
- Theme
- Size
- Variant

---

## 3. Requisitos

### 3.1 Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF01 | Dividir ui.ts em módulos por categoria | Alta |
| RF02 | Manter compatibilidade com imports existentes | Alta |
| RF03 | Preservar todos os tipos existentes | Alta |
| RF04 | Criar index.ts que re-exporta tudo | Alta |
| RF05 | Permitir imports específicos por categoria | Média |

### 3.2 Requisitos Não-Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF01 | Arquivos com no máximo 100 linhas | Alta |
| RNF02 | Documentação JSDoc em português | Média |
| RNF03 | Zero breaking changes | Alta |
| RNF04 | Build sem erros após refatoração | Alta |

### 3.3 Critérios de Aceite

- [ ] Arquivo ui.ts dividido em 5-6 módulos
- [ ] Cada módulo com no máximo 100 linhas
- [ ] Import `import { FuelData } from './types/ui'` continua funcionando
- [ ] Imports específicos possíveis: `import { FuelData } from './types/ui/dashboard'`
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona normalmente
- [ ] 100% da refatoração de types concluída

---

## 4. Arquitetura Proposta

### 4.1 Estrutura de Diretórios

```
src/types/
├── ui/
│   ├── index.ts                    # Re-exporta tudo
│   ├── dashboard.ts                # Tipos de dashboard
│   ├── forms.ts                    # Tipos de formulários
│   ├── tables.ts                   # Tipos de tabelas
│   ├── charts.ts                   # Tipos de gráficos
│   └── common.ts                   # Tipos comuns
│
├── ui.ts                           # DEPRECADO - redireciona para ui/index.ts
├── database/                       # ✅ Já modularizado
├── fechamento.ts                   # Mantido
└── index.ts                        # Ponto de entrada principal
```

### 4.2 Exemplo de Módulo

```typescript
// ui/dashboard.ts

/**
 * Tipos de UI para Dashboards
 * 
 * @remarks
 * Tipos utilizados nos componentes de dashboard do sistema.
 * Inclui métricas, gráficos e visualizações.
 */

/**
 * Dados de combustível para visualização
 */
export interface FuelData {
  name: string
  volume: number
  maxCapacity: number
  color: string
}

/**
 * Dados de pagamento para gráficos
 */
export interface PaymentData {
  name: string
  percentage: number
  value: number
  color: string
}

/**
 * Status de fechamento de caixa
 */
export interface ClosingData {
  id: string
  name: string
  avatar: string
  shift: string
  totalSales: number
  status: 'OK' | 'Divergente' | 'Aberto'
  sessionStatus: 'conferido' | 'pendente'
}

/**
 * Dados de performance de frentista
 */
export interface AttendantPerformance {
  id: string
  name: string
  avatar: string
  metric: string
  value: string
  subValue: string
  type: 'ticket' | 'volume' | 'divergence'
  status: 'conferido' | 'pendente'
}

/**
 * KPIs do dashboard
 */
export interface KPIs {
  totalSales: number
  avgTicket: number
  totalDivergence: number
  totalVolume: number
  totalProfit: number
}
```

### 4.3 Arquivo index.ts (Agregador)

```typescript
// ui/index.ts

/**
 * Tipos de UI
 * 
 * @remarks
 * Tipos TypeScript para componentes de interface do usuário.
 * Organizados por categoria para melhor manutenibilidade.
 */

// Exporta tipos de dashboard
export type {
  FuelData,
  PaymentData,
  ClosingData,
  AttendantPerformance,
  KPIs
} from './dashboard'

// Exporta tipos de formulários
export type {
  FormField,
  FormSection,
  ValidationRule,
  FormState
} from './forms'

// Exporta tipos de tabelas
export type {
  TableColumn,
  TableRow,
  TableSort,
  TableFilter,
  PaginationConfig
} from './tables'

// Exporta tipos de gráficos
export type {
  ChartData,
  ChartConfig,
  ChartSeries,
  ChartAxis
} from './charts'

// Exporta tipos comuns
export type {
  Status,
  Priority,
  Theme,
  Size,
  Variant
} from './common'
```

### 4.4 Compatibilidade com Código Existente

```typescript
// src/types/ui.ts (DEPRECADO)

/**
 * @deprecated
 * Este arquivo foi modularizado. Use:
 * - `import { FuelData } from './ui'` para imports gerais
 * - `import { FuelData } from './ui/dashboard'` para imports específicos
 * 
 * Este arquivo será removido na versão 2.0
 */

export * from './ui'
```

---

## 5. Plano de Implementação

### 5.1 Fases

| Fase | Descrição | Arquivos | Estimativa |
|------|-----------|----------|------------|
| 1 | Criar estrutura de diretórios | `ui/` | Pequeno |
| 2 | Criar common.ts | Tipos comuns | Pequeno |
| 3 | Criar dashboard.ts | Tipos de dashboard | Pequeno |
| 4 | Criar forms.ts | Tipos de formulários | Pequeno |
| 5 | Criar tables.ts | Tipos de tabelas | Pequeno |
| 6 | Criar charts.ts | Tipos de gráficos | Pequeno |
| 7 | Criar index.ts agregador | Ponto de entrada | Pequeno |
| 8 | Deprecar ui.ts original | Redirect | Pequeno |
| 9 | Testes e validação | Build, runtime | Médio |

### 5.2 Estratégia de Commits

Seguindo Conventional Commits:

```bash
refactor(types): cria estrutura modular para ui types (#12)
refactor(types): extrai tipos comuns (#12)
refactor(types): extrai tipos de dashboard (#12)
refactor(types): extrai tipos de formulários (#12)
refactor(types): extrai tipos de tabelas (#12)
refactor(types): extrai tipos de gráficos (#12)
refactor(types): finaliza modularização do ui.ts (#12)
```

### 5.3 Checklist de Execução

```markdown
## Fase 1: Estrutura
- [ ] Criar diretório `src/types/ui/`
- [ ] Verificar que Git rastreou a mudança

## Fase 2-6: Modularização
- [ ] Criar `common.ts` com tipos base
- [ ] Criar `dashboard.ts` com tipos de dashboard
- [ ] Criar `forms.ts` com tipos de formulários
- [ ] Criar `tables.ts` com tipos de tabelas
- [ ] Criar `charts.ts` com tipos de gráficos

## Fase 7: Agregação
- [ ] Criar `index.ts` que re-exporta tudo
- [ ] Adicionar JSDoc completo

## Fase 8: Compatibilidade
- [ ] Deprecar `ui.ts` original (criar redirect)
- [ ] Adicionar JSDoc de depreciação

## Fase 9: Testes
- [ ] `npm run build` sem erros
- [ ] Testar `localhost:3015`
- [ ] Verificar imports em componentes

## Fase 10: Documentação
- [ ] Atualizar CHANGELOG.md
- [ ] Atualizar STATUS_DO_PROJETO.md
- [ ] Atualizar PLANO-REFATORACAO-COMPLETO.md
```

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change em imports | Baixa | Médio | Manter ui.ts como redirect |
| Erros de tipagem | Baixa | Baixo | Testar build após cada fase |
| Tipos esquecidos | Média | Médio | Revisar ui.ts linha por linha |

---

## 7. Definição de Pronto (DoD)

- [ ] Arquivo ui.ts dividido em 5-6 módulos
- [ ] Cada módulo com no máximo 100 linhas
- [ ] Documentação JSDoc completa em português
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona em localhost:3015
- [ ] Imports existentes funcionam sem alteração
- [ ] Issue #12 fechada
- [ ] CHANGELOG.md atualizado
- [ ] Sprint 1 marcada como 100% concluída

---

## 8. Métricas de Sucesso

### 8.1 Antes da Refatoração

| Métrica | Valor |
|---------|-------|
| Arquivos | 1 |
| Linhas totais | 406 |
| Tamanho total | 9 KB |
| Categorias por arquivo | Todas |

### 8.2 Depois da Refatoração

| Métrica | Valor Esperado |
|---------|----------------|
| Arquivos | 6 |
| Linhas por arquivo | ~50-80 |
| Tamanho por arquivo | ~1-2 KB |
| Categorias por arquivo | 1 |

### 8.3 Redução de Dívida Técnica

- **Navegabilidade:** ⬆️ +80%
- **Manutenibilidade:** ⬆️ +75%
- **Clareza de código:** ⬆️ +70%
- **Sprint 1:** ✅ 100% Concluída

---

## 9. Referências

### 9.1 Documentação
- [TypeScript - Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- [TypeScript - Type Declarations](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

### 9.2 Projeto
- Issue: [#12](https://github.com/Thyago-vibe/Posto-Providencia/issues/12)
- Branch: `refactor/tech-debt`
- Arquivo original: `src/types/ui.ts` (406 linhas)
- PRD Relacionado: PRD-011 (Modularização database.ts)

---

## 10. Anexos

### 10.1 Mapeamento de Tipos por Categoria

| Categoria | Tipos | Linhas Estimadas |
|-----------|-------|------------------|
| Common | Status, Priority, Theme, Size, Variant | ~40 |
| Dashboard | FuelData, PaymentData, ClosingData, KPIs | ~80 |
| Forms | FormField, FormSection, ValidationRule | ~60 |
| Tables | TableColumn, TableRow, TableSort, TableFilter | ~70 |
| Charts | ChartData, ChartConfig, ChartSeries | ~60 |

**Total:** ~310 linhas úteis (96 linhas de boilerplate removidas)

---

**Documento criado em:** 10/01/2026  
**Última atualização:** 10/01/2026  
**Próxima revisão:** Após implementação
