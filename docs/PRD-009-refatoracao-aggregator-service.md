# PRD-009: Refatoração Legacy Service → Aggregator Service

> **Versão:** 1.0  
> **Data:** 10/01/2026  
> **Issue:** #9  
> **Autor:** Thyago  
> **Status:** Em Análise  
> **Dependências:** PRD-008 (Modularização do api.ts)

---

## 1. Resumo Executivo

### 1.1 Problema
O arquivo `src/services/api/legacy.service.ts` (726 linhas) foi criado durante a modularização do `api.ts` como camada de compatibilidade temporária. Porém, sua função de **agregação de dados** é um padrão arquitetural permanente e necessário, não código legado.

O nome "legacy" sugere código temporário que deveria ser removido, quando na verdade é uma **camada essencial** da arquitetura.

### 1.2 Solução Proposta
Refatorar `legacy.service.ts` para `aggregator.service.ts`, aplicando o padrão **Facade** de forma oficial e permanente, com:
- Renomeação do arquivo e service
- Documentação profissional do padrão arquitetural
- Divisão em aggregators especializados (opcional)
- Atualização de todos os imports e exports

### 1.3 Benefícios Esperados
- ✅ Nome descritivo e profissional
- ✅ Padrão arquitetural claro e documentado
- ✅ Remove conotação de "código velho"
- ✅ Facilita onboarding de novos desenvolvedores
- ✅ Alinha com boas práticas de Clean Architecture

---

## 2. Contexto e Motivação

### 2.1 Estado Atual

| Métrica | Valor Atual | Problema |
|---------|-------------|----------|
| Nome do arquivo | `legacy.service.ts` | Sugere código temporário |
| Linhas de código | 726 | Arquivo grande, difícil de navegar |
| Número de funções | 6 | Todas no mesmo arquivo |
| Documentação | Básica | Não explica padrão arquitetural |
| Uso de `any` | ~15 ocorrências | Falta tipagem forte |

### 2.2 Funções Atuais

| Função | Linhas | Services Usados | Componente |
|--------|--------|-----------------|------------|
| `fetchSettingsData` | ~30 | 3 services | TelaConfiguracoes |
| `fetchDashboardData` | ~210 | 5 services | TelaDashboard |
| `fetchClosingData` | ~100 | 4 services | TelaFechamentoDiario |
| `fetchAttendantsData` | ~100 | 2 services | TelaGestaoFrentistas |
| `fetchInventoryData` | ~150 | 3 services | TelaEstoque |
| `fetchProfitabilityData` | ~65 | 3 services | TelaAnaliseCustos |

### 2.3 Por que é Permanente?

O `legacy.service` não é código temporário porque:

1. **Reduz Acoplamento:** UI não precisa conhecer 10+ services
2. **Centraliza Lógica:** Cálculos e transformações em um só lugar
3. **Simplifica UI:** Componentes recebem dados prontos
4. **Padrão Consolidado:** Facade/Aggregator é padrão em Clean Architecture

**Exemplo:**
```typescript
// ❌ SEM Aggregator - Componente acoplado a múltiplos services
const [estoque, frentistas, formas, leituras, fechamentos] = await Promise.all([
  estoqueService.getAll(),
  frentistaService.getAll(),
  formaPagamentoService.getAll(),
  leituraService.getByDateRange(),
  fechamentoFrentistaService.getByDate()
]);
// ... 100+ linhas de cálculos e transformações

// ✅ COM Aggregator - Componente simples
const dashboardData = await fetchDashboardData(dateFilter, frentistaId);
```

---

## 3. Requisitos

### 3.1 Requisitos Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RF01 | Renomear `legacy.service.ts` → `aggregator.service.ts` | Alta |
| RF02 | Renomear `legacyService` → `aggregatorService` | Alta |
| RF03 | Manter todas as 6 funções funcionando | Alta |
| RF04 | Atualizar exports em `index.ts` | Alta |
| RF05 | Manter compatibilidade com componentes existentes | Alta |
| RF06 | Dividir em aggregators especializados (opcional) | Baixa |

### 3.2 Requisitos Não-Funcionais

| ID | Requisito | Prioridade |
|----|-----------|------------|
| RNF01 | Documentação JSDoc completa em português | Alta |
| RNF02 | Explicar padrão Facade/Aggregator | Alta |
| RNF03 | Zero breaking changes | Alta |
| RNF04 | Build sem erros após refatoração | Alta |
| RNF05 | Reduzir uso de `any` | Média |
| RNF06 | Adicionar testes unitários (futuro) | Baixa |

### 3.3 Critérios de Aceite

- [ ] Arquivo renomeado para `aggregator.service.ts`
- [ ] Service renomeado para `aggregatorService`
- [ ] Documentação JSDoc atualizada com padrão Facade
- [ ] Exports atualizados em `index.ts`
- [ ] Componentes continuam funcionando sem alteração
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona em localhost:3015
- [ ] PRD-009 documentado e commitado

---

## 4. Arquitetura Proposta

### 4.1 Estrutura Atual vs. Proposta

#### **Opção A: Arquivo Único (Simples)** ⭐ Recomendado

```
src/services/api/
├── aggregator.service.ts    # Todas as 6 funções (renomeado)
└── index.ts                  # Exports atualizados
```

**Vantagens:**
- ✅ Mudança mínima
- ✅ Fácil de encontrar
- ✅ Menos arquivos

**Desvantagens:**
- ❌ Arquivo ainda grande (726 linhas)

#### **Opção B: Dividido por Domínio (Modular)**

```
src/services/api/aggregators/
├── index.ts                        # Re-exporta todos
├── dashboard.aggregator.ts         # fetchDashboardData
├── settings.aggregator.ts          # fetchSettingsData
├── closing.aggregator.ts           # fetchClosingData
├── attendants.aggregator.ts        # fetchAttendantsData
├── inventory.aggregator.ts         # fetchInventoryData
└── profitability.aggregator.ts     # fetchProfitabilityData
```

**Vantagens:**
- ✅ Arquivos menores (~100-200 linhas cada)
- ✅ Melhor separação de responsabilidades
- ✅ Fácil de testar individualmente

**Desvantagens:**
- ❌ Mais arquivos para gerenciar
- ❌ Refatoração mais complexa

### 4.2 Documentação do Padrão Facade

```typescript
/**
 * Service Aggregator (Padrão Facade)
 * 
 * @remarks
 * Camada de agregação que combina dados de múltiplos services especializados
 * para fornecer interfaces simplificadas para a UI.
 * 
 * ## Propósito
 * Este é um padrão arquitetural PERMANENTE que:
 * - Reduz acoplamento entre UI e services de domínio
 * - Centraliza lógica de transformação e cálculo de dados
 * - Simplifica consumo de dados complexos nos componentes
 * - Melhora testabilidade e manutenibilidade
 * 
 * ## Padrão de Design
 * Implementa o padrão **Facade** (Gang of Four) adaptado para services.
 * 
 * @pattern Facade Pattern
 * @see https://refactoring.guru/design-patterns/facade
 * @see Clean Architecture - Robert C. Martin
 * 
 * ## Arquitetura em Camadas
 * ```
 * UI Layer (Componentes)
 *     ↓
 * Aggregator Layer (Este arquivo) ← Você está aqui
 *     ↓
 * Domain Services Layer (combustivelService, frentistaService, etc)
 *     ↓
 * Data Layer (Supabase)
 * ```
 * 
 * @example
 * ```typescript
 * // Componente usa aggregator em vez de múltiplos services
 * const data = await aggregatorService.fetchDashboardData('hoje', null, null, postoId);
 * ```
 */
export const aggregatorService = {
  // ... funções
}
```

### 4.3 Exemplo de Função Documentada

```typescript
/**
 * Busca dados agregados para o dashboard principal
 * 
 * @remarks
 * Agrega dados de múltiplos services:
 * - estoqueService (níveis de combustível)
 * - frentistaService (lista de frentistas)
 * - formaPagamentoService (formas de pagamento)
 * - leituraService (vendas do período)
 * - fechamentoFrentistaService (fechamentos de caixa)
 * 
 * Calcula métricas consolidadas:
 * - Total de vendas
 * - Ticket médio
 * - Lucro estimado
 * - Performance por frentista
 * 
 * @param dateFilter - Filtro de período ('hoje' | 'ontem' | 'semana' | 'mes')
 * @param frentistaId - ID do frentista para filtrar (opcional)
 * @param _turnoId - Deprecated: sistema não usa mais turnos
 * @param postoId - ID do posto (opcional)
 * 
 * @returns Objeto com dados consolidados do dashboard
 * 
 * @example
 * ```typescript
 * const data = await aggregatorService.fetchDashboardData('hoje', null, null, 1);
 * console.log(data.kpis.totalSales); // Total de vendas do dia
 * ```
 */
async fetchDashboardData(
  dateFilter: string = 'hoje',
  frentistaId: number | null = null,
  _turnoId: number | null = null,
  postoId?: number
) {
  // ... implementação
}
```

---

## 5. Plano de Implementação

### 5.1 Fases (Opção A - Arquivo Único)

| Fase | Descrição | Arquivos | Estimativa |
|------|-----------|----------|------------|
| 1 | Renomear arquivo via Git | `legacy.service.ts` → `aggregator.service.ts` | Pequeno |
| 2 | Atualizar nome do service | `legacyService` → `aggregatorService` | Pequeno |
| 3 | Atualizar documentação JSDoc | Todas as funções | Médio |
| 4 | Atualizar exports em `index.ts` | `index.ts` | Pequeno |
| 5 | Adicionar alias de compatibilidade | `index.ts` | Pequeno |
| 6 | Testar build | - | Pequeno |
| 7 | Testar aplicação | localhost:3015 | Médio |
| 8 | Atualizar PRD-008 | Documentação | Pequeno |
| 9 | Commit e documentação | Git | Pequeno |

### 5.2 Estratégia de Commits

Seguindo Conventional Commits:

```bash
# Fase 1-2: Renomeação
refactor(api): renomeia legacy.service para aggregator.service (#9)

# Fase 3-4: Documentação e exports
docs(api): documenta padrão Facade no aggregator service (#9)

# Fase 8: Atualização do PRD
docs: adiciona PRD-009 e atualiza PRD-008 com aggregator (#9)
```

### 5.3 Checklist de Execução

```markdown
## Fase 1: Renomeação
- [ ] `git mv src/services/api/legacy.service.ts src/services/api/aggregator.service.ts`
- [ ] Verificar que Git rastreou a mudança

## Fase 2: Atualizar Service
- [ ] Substituir `export const legacyService` → `export const aggregatorService`
- [ ] Atualizar imports internos se necessário

## Fase 3: Documentação
- [ ] Adicionar JSDoc principal do arquivo
- [ ] Documentar padrão Facade
- [ ] Adicionar exemplos de uso
- [ ] Documentar cada função individualmente

## Fase 4: Atualizar index.ts
- [ ] Atualizar `export { legacyService }` → `export { aggregatorService }`
- [ ] Atualizar imports: `import { legacyService }` → `import { aggregatorService }`
- [ ] Atualizar binds: `legacyService.fetch*` → `aggregatorService.fetch*`
- [ ] Adicionar alias: `export { aggregatorService as legacyService }` (temporário)

## Fase 5: Testes
- [ ] `npm run build` sem erros
- [ ] Testar `localhost:3015`
- [ ] Verificar TelaDashboard
- [ ] Verificar TelaConfiguracoes
- [ ] Verificar TelaFechamentoDiario
- [ ] Verificar TelaGestaoFrentistas
- [ ] Verificar TelaEstoque
- [ ] Verificar TelaAnaliseCustos

## Fase 6: Documentação
- [ ] Atualizar PRD-008 mencionando aggregator
- [ ] Criar/atualizar CHANGELOG.md
- [ ] Atualizar STATUS_DO_PROJETO.md

## Fase 7: Commit
- [ ] Commit com mensagem semântica
- [ ] Push para branch
- [ ] Verificar CI/CD
```

---

## 6. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Breaking change em imports | Baixa | Alto | Manter alias `legacyService` temporário |
| Componentes param de funcionar | Baixa | Alto | Testar todos os 6 componentes após mudança |
| Erros de build | Média | Médio | Verificar TypeScript antes de commit |
| Perda de histórico Git | Baixa | Médio | Usar `git mv` em vez de renomear manual |

---

## 7. Melhorias Futuras (Pós-Refatoração)

### 7.1 Redução de `any`
- Criar tipos específicos para retornos de cada função
- Tipar corretamente parâmetros e retornos

### 7.2 Divisão em Aggregators Especializados
- Implementar Opção B (arquivos separados)
- Criar pasta `aggregators/`

### 7.3 Testes Unitários
- Adicionar testes para cada função do aggregator
- Mock dos services de domínio

### 7.4 Cache e Performance
- Implementar cache de dados agregados
- Otimizar queries paralelas

---

## 8. Definição de Pronto (DoD)

- [ ] Arquivo renomeado para `aggregator.service.ts`
- [ ] Service renomeado para `aggregatorService`
- [ ] Documentação JSDoc completa em português
- [ ] Padrão Facade documentado
- [ ] Exports atualizados em `index.ts`
- [ ] `npm run build` passa sem erros
- [ ] Aplicação funciona em localhost:3015
- [ ] Todos os 6 componentes testados
- [ ] PRD-009 criado e documentado
- [ ] CHANGELOG.md atualizado
- [ ] Commits semânticos realizados
- [ ] Issue #9 fechada

---

## 9. Referências

### 9.1 Padrões de Design
- [Facade Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/facade)
- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Service Layer Pattern](https://martinfowler.com/eaaCatalog/serviceLayer.html)

### 9.2 Projeto
- Issue: [#9](https://github.com/Thyago-vibe/Posto-Providencia/issues/9)
- Branch: `refactor/issue-9-aggregator-service`
- PRD Relacionado: PRD-008 (Modularização do api.ts)
- Arquivo atual: `src/services/api/legacy.service.ts` (726 linhas)

---

## 10. Anexos

### 10.1 Comparação de Nomes

| Antes | Depois | Justificativa |
|-------|--------|---------------|
| `legacy.service.ts` | `aggregator.service.ts` | Nome descritivo do padrão |
| `legacyService` | `aggregatorService` | Consistência com arquivo |
| "Funções de compatibilidade" | "Service Aggregator (Facade)" | Padrão arquitetural oficial |

### 10.2 Impacto nos Componentes

| Componente | Função Usada | Impacto |
|------------|--------------|---------|
| TelaConfiguracoes | `fetchSettingsData` | Zero (alias mantido) |
| TelaDashboard | `fetchDashboardData` | Zero (alias mantido) |
| TelaFechamentoDiario | `fetchClosingData` | Zero (alias mantido) |
| TelaGestaoFrentistas | `fetchAttendantsData` | Zero (alias mantido) |
| TelaEstoque | `fetchInventoryData` | Zero (alias mantido) |
| TelaAnaliseCustos | `fetchProfitabilityData` | Zero (alias mantido) |

**Nota:** Todos os componentes continuam funcionando sem alteração graças ao alias de compatibilidade.

---

**Documento criado em:** 10/01/2026  
**Última atualização:** 10/01/2026  
**Próxima revisão:** Após implementação
