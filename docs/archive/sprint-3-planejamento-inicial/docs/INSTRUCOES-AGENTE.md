# 🤖 INSTRUÇÕES PARA O AGENTE - Sprint 3 Final

> **Data:** 11/01/2026
> **Tarefa:** Refatorar TelaGestaoFinanceira.tsx
> **Objetivo:** Completar Sprint 3 (100%)

---

## 🎯 MISSÃO

Refatorar o componente `TelaGestaoFinanceira.tsx` (604 linhas) seguindo o padrão estabelecido nas Issues #19 e #20, criando uma estrutura modular com hooks e componentes especializados.

---

## 📋 DOCUMENTAÇÃO ESSENCIAL

### 1. PRD Completo
- **Arquivo:** [PRD-021-refatoracao-tela-gestao-financeira.md](./PRD-021-refatoracao-tela-gestao-financeira.md)
- **Contém:** Especificação completa, arquitetura, tipos, critérios de aceite

### 2. Regras do Projeto
- **Arquivo:** [../../CLAUDE.md](../../CLAUDE.md)
- **CRÍTICO:** Seguir TODAS as regras, especialmente:
  - Tudo em Português (Brasil)
  - JSDoc obrigatório
  - Zero uso de `any`
  - Commits pequenos e semânticos

### 3. Referências de Padrão
- **Exemplo completo:** `src/components/registro-compras/` (Issue #19)
- **Hooks de exemplo:** `src/hooks/registro-compras/`
- **Componente atual:** `src/components/TelaGestaoFinanceira.tsx`

---

## 🏗️ ESTRUTURA A CRIAR

```
src/components/financeiro/
├── TelaGestaoFinanceira.tsx          # ~100-120 linhas (orquestrador)
│
├── components/
│   ├── ResumoFinanceiro.tsx          # Cards de métricas (~150 linhas)
│   ├── GraficoFluxoCaixa.tsx         # Gráfico Recharts (~180 linhas)
│   ├── TabelaTransacoes.tsx          # Lista de transações (~200 linhas)
│   ├── FiltrosFinanceiros.tsx        # Filtros de período (~120 linhas)
│   └── IndicadoresPerformance.tsx    # KPIs adicionais (~100 linhas)
│
└── hooks/
    ├── useFinanceiro.ts              # Dados agregados (~150 linhas)
    ├── useFluxoCaixa.ts              # Cálculos (~120 linhas)
    └── useFiltrosFinanceiros.ts      # Estado de filtros (~80 linhas)
```

---

## 📝 PASSO A PASSO

### Fase 1: Preparação (30min)
```bash
# 1. Criar branch
git checkout -b refactor/tela-gestao-financeira

# 2. Criar estrutura
mkdir -p src/components/financeiro/components
mkdir -p src/components/financeiro/hooks

# 3. Analisar componente atual
# Ler src/components/TelaGestaoFinanceira.tsx
# Identificar responsabilidades e lógica
```

### Fase 2: Hooks (3-4h)

**2.1 - useFiltrosFinanceiros.ts**
- Estado de filtros (dataInicio, dataFim, tipo, categoria)
- Função `atualizar(campo, valor)`
- Função `resetar()`
- Função `aplicarPreset('hoje' | 'semana' | 'mes')`
- JSDoc completo

**2.2 - useFinanceiro.ts**
- Buscar vendas (leituraService)
- Buscar despesas (despesaService)
- Buscar recebimentos (recebimentoService)
- Buscar compras (compraService)
- Agregar em DadosFinanceiros
- Calcular receitas, despesas, lucro
- JSDoc completo

**2.3 - useFluxoCaixa.ts**
- Receber DadosFinanceiros
- Agrupar por dia/semana/mês
- Calcular saldo acumulado
- Retornar SerieFluxoCaixa[]
- JSDoc completo

### Fase 3: Componentes UI (3-4h)

**3.1 - FiltrosFinanceiros.tsx**
- DatePicker início/fim
- Select tipo transação
- Botões preset (Hoje, Semana, Mês)
- Botão Limpar
- JSDoc completo

**3.2 - ResumoFinanceiro.tsx**
- 4 cards: Receitas, Despesas, Lucro, Margem
- Variação percentual vs período anterior
- Cores semânticas (verde/vermelho)
- Loading skeleton
- JSDoc completo

**3.3 - GraficoFluxoCaixa.tsx**
- Usar Recharts (AreaChart)
- Eixo X: datas
- Eixo Y: valores
- Áreas: receitas (verde), despesas (vermelho)
- Linha: saldo acumulado
- Tooltip customizado
- JSDoc completo

**3.4 - TabelaTransacoes.tsx**
- Colunas: Data, Tipo, Categoria, Descrição, Valor
- Ordenação por coluna
- Paginação (20/página)
- JSDoc completo

**3.5 - IndicadoresPerformance.tsx**
- Ticket médio
- ROI
- Despesas/Receita ratio
- Projeção fim do mês
- JSDoc completo

### Fase 4: Integração (1-2h)

**4.1 - Refatorar TelaGestaoFinanceira.tsx**
```typescript
const TelaGestaoFinanceira: React.FC = () => {
  const { filtros, atualizar, aplicarPreset } = useFiltrosFinanceiros();
  const { dados, carregando } = useFinanceiro(filtros);
  const { series } = useFluxoCaixa(dados, 'diario');

  return (
    <div className="p-6 space-y-6">
      <h1>Gestão Financeira</h1>
      <FiltrosFinanceiros filtros={filtros} onAplicar={atualizar} />
      <ResumoFinanceiro dados={dados} carregando={carregando} />
      <GraficoFluxoCaixa series={series} />
      <IndicadoresPerformance dados={dados} />
      <TabelaTransacoes transacoes={dados.transacoes} />
    </div>
  );
};
```

**4.2 - Testes manuais**
- Verificar filtros funcionam
- Verificar cálculos corretos
- Verificar gráfico renderiza
- Verificar tabela exibe dados
- Verificar responsividade

### Fase 5: Validação

```bash
# Build
bun run build

# Dev server
bun run dev --port 3015

# Testar em http://localhost:3015
# Navegar para Gestão Financeira
# Testar TODAS as funcionalidades
```

### Fase 6: Documentação (30min)

**6.1 - Atualizar CHANGELOG.md**
```markdown
### 🚀 Sprint 3 COMPLETA - Componentes Médios
- **Issue #21 - TelaGestaoFinanceira.tsx:** Modularização concluída.
  - **Antes:** 604 linhas monolíticas
  - **Depois:** ~100 linhas (orquestrador) + 10 módulos
  - **Redução:** 83% no arquivo principal
  - Hooks: useFinanceiro, useFluxoCaixa, useFiltrosFinanceiros
  - Componentes: 5 componentes UI especializados
- **Métrica Sprint 3:** 100% COMPLETA 🎉
```

**6.2 - Criar Issue #21**
```bash
gh issue create --title "Refatorar TelaGestaoFinanceira.tsx (604 linhas)" \
  --body "Sprint 3 - Componente 3/3. Ver PRD-021 para detalhes."
```

### Fase 7: Finalização (30min)

```bash
# Commit
git add .
git commit -m "refactor: modulariza TelaGestaoFinanceira em 10 módulos (#21)

- Cria hooks: useFinanceiro, useFluxoCaixa, useFiltrosFinanceiros
- Cria componentes: ResumoFinanceiro, GraficoFluxoCaixa, TabelaTransacoes, FiltrosFinanceiros, IndicadoresPerformance
- Reduz arquivo principal de 604 para ~100 linhas (-83%)
- JSDoc completo em português
- Zero uso de 'any'
- Build sem erros

Sprint 3 COMPLETA 🎉"

# Push
git push -u origin refactor/tela-gestao-financeira

# PR (opcional - aguardar validação manual primeiro)
```

---

## ✅ CRITÉRIOS DE ACEITE (OBRIGATÓRIOS)

### Código
- [ ] Componente principal <150 linhas
- [ ] Cada hook <150 linhas
- [ ] Cada componente UI <250 linhas
- [ ] Zero uso de `any`
- [ ] JSDoc completo em **PORTUGUÊS**
- [ ] Tipos TypeScript para tudo

### Funcionalidade
- [ ] Filtros de período funcionam
- [ ] Cálculos corretos (receita, despesa, lucro, margem)
- [ ] Gráfico renderiza corretamente
- [ ] Tabela exibe todas transações
- [ ] Paginação funciona
- [ ] Zero breaking changes

### Build
- [ ] `bun run build` sem erros
- [ ] `bun run dev` sem warnings
- [ ] Testes manuais em localhost:3015 passam

### Documentação
- [ ] CHANGELOG.md atualizado
- [ ] Issue #21 criada e fechada
- [ ] Comentários claros em lógica complexa

---

## ⚠️ REGRAS CRÍTICAS

### ❌ PROIBIDO
- Usar inglês em comentários/strings
- Usar `any` em qualquer lugar
- Criar código sem JSDoc
- Fazer commits grandes
- Pular testes manuais
- Alterar funcionalidade existente

### ✅ OBRIGATÓRIO
- TODO em Português (Brasil)
- JSDoc em TODOS os arquivos
- Tipos TypeScript rigorosos
- Commits semânticos pequenos
- Testar TUDO antes de commitar
- Seguir padrão dos exemplos

---

## 📊 MÉTRICAS ESPERADAS

| Métrica | Antes | Depois | Objetivo |
|---------|-------|--------|----------|
| Linhas arquivo principal | 604 | ~100 | -83% |
| Arquivos | 1 | 10 | Modularizado |
| Testabilidade | Difícil | Fácil | +90% |
| Documentação | 0% | 100% | Completa |

---

## 🎯 RESULTADO FINAL

Ao completar esta tarefa:

✅ **Sprint 3: 100% COMPLETA**
✅ **Dívida Técnica: ~15% restante** (de 100% inicial)
✅ **Total Refatorado: ~14.000 linhas**
✅ **Projeto: Pronto para Sprint 4 ou testes**

---

## 📚 REFERÊNCIAS RÁPIDAS

### Exemplo de Hook
```typescript
/**
 * Hook para gerenciamento de [FUNCIONALIDADE].
 *
 * [DESCRIÇÃO DETALHADA DO QUE FAZ]
 *
 * @param parametro - Descrição do parâmetro
 * @returns [DESCRIÇÃO DO RETORNO]
 *
 * @example
 * const { dados, atualizar } = useExemplo(123);
 */
export function useExemplo(parametro: number) {
  // implementação
}
```

### Exemplo de Componente
```typescript
/**
 * Componente [NOME E PROPÓSITO].
 *
 * [DESCRIÇÃO DETALHADA]
 *
 * @param props - Propriedades do componente
 * @returns Elemento React
 */
export const ExemploComponente: React.FC<ExemploProps> = ({ prop }) => {
  // implementação
};
```

---

**BOA SORTE! VOCÊ VAI COMPLETAR A SPRINT 3! 🚀**

**Status:** 📋 Pronto para execução
**Prioridade:** 🔴 Alta (Último componente Sprint 3)
**Estimativa:** 8-12 horas
