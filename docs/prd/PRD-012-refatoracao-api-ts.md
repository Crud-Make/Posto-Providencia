# PRD-008: Modularização do api.ts

> **Versão:** 1.0
> **Data:** 09/01/2026
> **Issue:** #8
> **Autor:** Thyago
> **Status:** Em Análise

---

## 1. Resumo Executivo

### 1.1 Problema
O arquivo `src/services/api.ts` cresceu para **4.115 linhas**, tornando-se um monolito difícil de manter, navegar e testar. Contém 20+ services misturados, uso extensivo de `any`, e código duplicado.

### 1.2 Solução Proposta
Modularizar o arquivo em services separados por domínio de negócio, mantendo compatibilidade total com o código existente.

### 1.3 Benefícios Esperados
- Redução de 90% no tamanho de cada arquivo individual
- Eliminação completa de `any` (segurança de tipos)
- Facilidade de navegação e manutenção
- Menor risco de conflitos em merges
- Melhor testabilidade

---

## 2. Contexto e Motivação

### 2.1 Estado Atual

| Métrica | Valor Atual | Meta |
|---------|-------------|------|
| Linhas de código | 4.115 | ~200-300 por arquivo |
| Número de services | 20+ em 1 arquivo | 1 por arquivo |
| Uso de `any` | ~30+ ocorrências | 0 |
| Duplicação de código | Alta (filtro postoId) | Eliminada |

### 2.2 Services Identificados no api.ts

1. `postoService` - Gestão de postos
2. `combustivelService` - Combustíveis
3. `bombaService` - Bombas
4. `bicoService` - Bicos
5. `frentistaService` - Frentistas
6. `leituraService` - Leituras de encerrantes
7. `formaPagamentoService` - Formas de pagamento
8. `maquininhaService` - Maquininhas
9. `fechamentoService` - Fechamentos de caixa
10. `recebimentoService` - Recebimentos
11. `fechamentoFrentistaService` - Fechamento por frentista
12. `estoqueService` - Estoque
13. `compraService` - Compras
14. `fornecedorService` - Fornecedores
15. `turnoService` - Turnos
16. `emprestimoService` - Empréstimos
17. `parcelaService` - Parcelas
18. `configuracaoService` - Configurações
19. `dashboardService` - Dashboard
20. `salesAnalysisService` - Análise de vendas
21. `notificationService` - Notificações push
22. `dividaService` - Dívidas
23. `solvencyService` - Solvência
24. `despesaService` - Despesas

### 2.3 Funções de Compatibilidade (Legacy)

- `fetchSettingsData()`
- `fetchDashboardData()`
- `fetchClosingData()`
- `fetchAttendantsData()`

---

## 3. Requisitos

### 3.1 Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF01 | Manter compatibilidade com imports existentes | Alta |
| RF02 | Exportar objeto `api` com mesma estrutura | Alta |
| RF03 | Manter funções `fetch*Data` funcionando | Alta |
| RF04 | Preservar toda lógica de negócio existente | Alta |

### 3.2 Requisitos Não-Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF01 | Zero uso de `any` - tipagem completa | Alta |
| RNF02 | Documentação JSDoc em português | Média |
| RNF03 | Arquivos com no máximo 400 linhas | Média |
| RNF04 | Build sem erros após refatoração | Alta |
| RNF05 | Sem breaking changes na API pública | Alta |

### 3.3 Critérios de Aceite

- [ ] Todos os services em arquivos separados
- [ ] Import `import { api } from './services/api'` continua funcionando
- [ ] Import `import { combustivelService } from './services/api'` continua funcionando
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona normalmente em localhost:3015
- [ ] Nenhum `any` no código novo

---

## 4. Arquitetura Proposta

### 4.1 Estrutura de Diretórios

```
src/services/
├── api/
│   ├── index.ts                    # Ponto de entrada (re-exporta tudo)
│   ├── base.ts                     # Helpers e tipos comuns
│   │
│   │── # DOMÍNIO: Infraestrutura do Posto
│   ├── posto.service.ts            # postoService
│   ├── turno.service.ts            # turnoService
│   ├── configuracao.service.ts     # configuracaoService
│   │
│   │── # DOMÍNIO: Combustíveis e Equipamentos
│   ├── combustivel.service.ts      # combustivelService
│   ├── bomba.service.ts            # bombaService
│   ├── bico.service.ts             # bicoService
│   ├── estoque.service.ts          # estoqueService
│   │
│   │── # DOMÍNIO: Operações Diárias
│   ├── frentista.service.ts        # frentistaService
│   ├── leitura.service.ts          # leituraService
│   ├── fechamento.service.ts       # fechamentoService + fechamentoFrentistaService + recebimentoService
│   │
│   │── # DOMÍNIO: Pagamentos e Máquinas
│   ├── pagamento.service.ts        # formaPagamentoService + maquininhaService
│   │
│   │── # DOMÍNIO: Financeiro
│   ├── financeiro.service.ts       # emprestimoService + parcelaService + dividaService + solvencyService + despesaService
│   ├── compra.service.ts           # compraService + fornecedorService
│   │
│   │── # DOMÍNIO: Relatórios e Dashboard
│   ├── dashboard.service.ts        # dashboardService + salesAnalysisService
│   ├── notificacao.service.ts      # notificationService
│   │
│   │── # Compatibilidade
│   └── legacy.ts                   # fetchSettingsData, fetchDashboardData, etc
│
├── supabase.ts                     # Cliente Supabase (já existe)
└── api.ts                          # DEPRECADO - redireciona para api/index.ts
```

### 4.2 Arquivo base.ts

```typescript
/**
 * Utilitários base para services da API
 */

import { supabase } from '../supabase';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Aplica filtro de posto_id em uma query Supabase
 *
 * @param query - Query builder do Supabase
 * @param postoId - ID do posto (opcional)
 * @returns Query com filtro aplicado
 */
export function withPostoFilter<T>(
  query: PostgrestFilterBuilder<any, any, T>,
  postoId?: number
): PostgrestFilterBuilder<any, any, T> {
  if (postoId) {
    return query.eq('posto_id', postoId);
  }
  return query;
}

/**
 * Trata erro do Supabase e lança exceção padronizada
 */
export function handleSupabaseError(error: unknown, operacao: string): never {
  console.error(`[API] Erro em ${operacao}:`, error);
  throw error;
}

// Re-exporta supabase para uso interno
export { supabase };
```

### 4.3 Exemplo de Service Modularizado

```typescript
// combustivel.service.ts

/**
 * Service de Combustíveis
 *
 * @remarks
 * Gerencia operações CRUD de combustíveis do posto
 */

import { supabase, withPostoFilter } from './base';
import type { Combustivel, InsertTables, UpdateTables } from '../../types/database';

/** Ordem de exibição padrão dos combustíveis */
const ORDEM_COMBUSTIVEIS = ['GC', 'GA', 'ET', 'S10', 'DIESEL'] as const;

export const combustivelService = {
  /** Ordem customizada dos combustíveis */
  ORDEM_COMBUSTIVEIS,

  /**
   * Busca todos os combustíveis ativos
   *
   * @param postoId - Filtro opcional por posto
   * @returns Lista de combustíveis ordenada
   */
  async getAll(postoId?: number): Promise<Combustivel[]> {
    const baseQuery = supabase
      .from('Combustivel')
      .select('*')
      .eq('ativo', true);

    const query = withPostoFilter(baseQuery, postoId);
    const { data, error } = await query;

    if (error) throw error;

    // Ordena por ordem customizada
    return (data || []).sort((a, b) => {
      const indexA = ORDEM_COMBUSTIVEIS.indexOf(a.codigo as typeof ORDEM_COMBUSTIVEIS[number]);
      const indexB = ORDEM_COMBUSTIVEIS.indexOf(b.codigo as typeof ORDEM_COMBUSTIVEIS[number]);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
  },

  // ... demais métodos
};
```

### 4.4 Arquivo index.ts (Ponto de Entrada)

```typescript
// api/index.ts

/**
 * Camada de Serviços da API
 *
 * @remarks
 * Ponto central de exportação de todos os services.
 * Mantém compatibilidade com imports existentes.
 */

// Exporta services individuais
export { postoService } from './posto.service';
export { combustivelService } from './combustivel.service';
export { bombaService } from './bomba.service';
export { bicoService } from './bico.service';
export { frentistaService } from './frentista.service';
export { leituraService } from './leitura.service';
export { fechamentoService, fechamentoFrentistaService, recebimentoService } from './fechamento.service';
export { formaPagamentoService, maquininhaService } from './pagamento.service';
export { estoqueService } from './estoque.service';
export { compraService, fornecedorService } from './compra.service';
export { turnoService } from './turno.service';
export { emprestimoService, parcelaService, dividaService, solvencyService, despesaService } from './financeiro.service';
export { configuracaoService } from './configuracao.service';
export { dashboardService, salesAnalysisService } from './dashboard.service';
export { notificationService } from './notificacao.service';

// Exporta funções de compatibilidade
export { fetchSettingsData, fetchDashboardData, fetchClosingData, fetchAttendantsData } from './legacy';

// Importa para montar objeto api
import { postoService } from './posto.service';
import { combustivelService } from './combustivel.service';
// ... todos os outros imports

/** Objeto api para compatibilidade com código legado */
export const api = {
  posto: postoService,
  combustivel: combustivelService,
  bomba: bombaService,
  bico: bicoService,
  frentista: frentistaService,
  leitura: leituraService,
  formaPagamento: formaPagamentoService,
  maquininha: maquininhaService,
  fechamento: fechamentoService,
  recebimento: recebimentoService,
  fechamentoFrentista: fechamentoFrentistaService,
  estoque: estoqueService,
  compra: compraService,
  fornecedor: fornecedorService,
  turno: turnoService,
  emprestimo: emprestimoService,
  parcela: parcelaService,
  dashboard: dashboardService,
  salesAnalysis: salesAnalysisService,
  despesa: despesaService,
  notification: notificationService,
  divida: dividaService,
  solvency: solvencyService,
};

export default api;
```

---

## 5. Plano de Implementação

### 5.1 Fases

| Fase | Descrição | Arquivos | Estimativa |
|------|-----------|----------|------------|
| 1 | Criar estrutura base | `base.ts`, `index.ts` | Pequeno |
| 2 | Migrar services simples | posto, turno, configuracao | Pequeno |
| 3 | Migrar combustíveis/equipamentos | combustivel, bomba, bico, estoque | Médio |
| 4 | Migrar operações diárias | frentista, leitura | Médio |
| 5 | Migrar fechamento (complexo) | fechamento, recebimento | Grande |
| 6 | Migrar pagamentos | formaPagamento, maquininha | Pequeno |
| 7 | Migrar financeiro | emprestimo, divida, solvency, despesa | Grande |
| 8 | Migrar compras | compra, fornecedor | Pequeno |
| 9 | Migrar dashboard | dashboard, salesAnalysis | Grande |
| 10 | Migrar notificações | notification | Pequeno |
| 11 | Migrar legacy | fetch*Data | Médio |
| 12 | Deprecar api.ts original | Redirect + cleanup | Pequeno |
| 13 | Testes e validação | Build, runtime | Médio |

### 5.2 Estratégia de Commits

Cada fase = 1 commit seguindo Conventional Commits:

```
refactor(api): cria estrutura base para modularização (#8)
refactor(api): extrai postoService para módulo separado (#8)
refactor(api): extrai combustivelService para módulo separado (#8)
...
refactor(api): finaliza modularização e remove api.ts original (#8)
```

### 5.3 Estratégia de Rollback

Se algo der errado:
1. O arquivo `api.ts` original será mantido até o final
2. Cada fase pode ser revertida individualmente
3. Branch separada permite abandonar sem impacto

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change em imports | Média | Alto | Manter exports idênticos no index.ts |
| Erros de tipagem | Alta | Médio | Resolver gradualmente, testar cada fase |
| Circular dependencies | Média | Alto | Estrutura de dependência clara (base → services → index) |
| Regressão funcional | Baixa | Alto | Testar em localhost:3015 após cada fase |

---

## 7. Definição de Pronto (DoD)

- [ ] Todos os services em arquivos separados
- [ ] Zero ocorrências de `any`
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona em localhost:3015
- [ ] Imports existentes funcionam sem alteração
- [ ] Documentação JSDoc em português
- [ ] Issue #8 fechada
- [ ] CHANGELOG.md atualizado

---

## 8. Referências

- Issue: [#8](https://github.com/Thyago-vibe/Posto-Providencia/issues/8)
- Branch: `refactor/issue-7-reestruturacao-src`
- Arquivo original: `src/services/api.ts` (4.115 linhas)
