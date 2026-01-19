# PRD-016: Refatoração TelaConfiguracoes.tsx

**Issue:** #16  
**Sprint:** Sprint 2 - Componentes Críticos  
**Branch:** `refactor/tech-debt`  
**Data:** 10/01/2026  
**Autor:** Sistema de Refatoração  
**Status:** 🔴 Não Iniciado

---

## 📋 Sumário Executivo

Refatorar o componente `TelaConfiguracoes.tsx` (983 linhas) em uma arquitetura modular seguindo o padrão estabelecido na Issue #13, com TypeScript estrito, JSDoc completo e conformidade total com `.cursorrules`.

---

## 🎯 Objetivos

### Objetivo Principal
Transformar arquivo monolítico de 983 linhas em arquitetura modular com hooks customizados e componentes reutilizáveis.

### Objetivos Específicos
1. ✅ Reduzir arquivo principal para < 200 linhas
2. ✅ Eliminar 100% dos usos de `any`
3. ✅ Adicionar JSDoc em 100% do código
4. ✅ Criar 4 hooks customizados
5. ✅ Criar 6 componentes de UI
6. ✅ Manter funcionalidade 100% intacta
7. ✅ Build passando sem erros

---

## 📊 Análise do Arquivo Atual

### Estrutura Atual
```
src/components/TelaConfiguracoes.tsx (983 linhas)
```

### Responsabilidades Identificadas
1. **Gestão de Produtos** (~150 linhas)
   - Listagem de produtos
   - CRUD de produtos
   - Validação de preços

2. **Gestão de Bicos** (~120 linhas)
   - Listagem de bicos
   - Associação bico-produto-tanque
   - CRUD de bicos

3. **Formas de Pagamento** (~200 linhas)
   - Listagem de formas de pagamento
   - Modal de criação/edição
   - CRUD completo
   - Gerenciamento de taxas

4. **Parâmetros de Configuração** (~150 linhas)
   - Tolerância de divergência
   - Dias de estoque crítico
   - Dias de estoque baixo
   - Salvamento de configurações

5. **Gestão de Tanques** (~100 linhas)
   - Componente TankManagement
   - Já modularizado

6. **Reset do Sistema** (~100 linhas)
   - Modal de confirmação
   - Validação de segurança
   - Execução de reset

7. **Carregamento de Dados** (~80 linhas)
   - useEffect para carregar dados
   - Tratamento de loading
   - Tratamento de erros

### Problemas Identificados

#### TypeScript Não-Estrito
```typescript
// Linha 111
type: updated.tipo as any,

// Linha 134
type: created.tipo as any,

// Linha 200
} catch (error: any) {

// Linha 748
type: e.target.value as any,
```

**Total:** 4+ ocorrências de `any`

#### Falta de JSDoc
- Zero documentação em interfaces
- Zero documentação em funções
- Zero documentação no componente

#### Falta de Rastreio
- Sem comentários `// [DD/MM HH:mm]`

---

## 🏗️ Arquitetura Proposta

### Estrutura de Diretórios
```
src/components/configuracoes/
├── index.ts                          # Barrel export
├── types.ts                          # Todas as interfaces (com JSDoc)
├── TelaConfiguracoes.tsx             # Componente principal (< 200 linhas)
├── hooks/
│   ├── useConfiguracoesData.ts       # Carregamento de dados
│   ├── useFormaPagamento.ts          # CRUD formas de pagamento
│   ├── useParametros.ts              # Gerenciamento de parâmetros
│   └── useResetSistema.ts            # Reset do sistema
└── components/
    ├── GestaoProdutos.tsx            # Tabela de produtos
    ├── GestaoBicos.tsx               # Tabela de bicos
    ├── GestaoFormasPagamento.tsx     # Tabela + Modal
    ├── ParametrosFechamento.tsx      # Card de parâmetros
    ├── ParametrosEstoque.tsx         # Card de estoque
    └── ModalResetSistema.tsx         # Modal de reset
```

---

## 📝 Especificação Detalhada

### 1. types.ts

**Responsabilidade:** Definir todas as interfaces TypeScript com JSDoc completo.

**Interfaces a Criar:**

```typescript
/**
 * Configuração de um produto
 * @interface ProductConfig
 */
interface ProductConfig {
    /** ID único do produto */
    id: string;
    /** Nome do produto */
    name: string;
    /** Tipo do produto (Combustível, Biocombustível, Diesel) */
    type: string;
    /** Preço por litro em reais */
    price: number;
}

/**
 * Configuração de um bico
 * @interface NozzleConfig
 */
interface NozzleConfig {
    /** ID único do bico */
    id: string;
    /** Número do bico */
    number: number;
    /** Nome do produto vinculado */
    productName: string;
    /** Tanque de origem */
    tankSource: string;
}

/**
 * Tipo de forma de pagamento
 * @typedef {'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros'} PaymentType
 */
type PaymentType = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros';

/**
 * Configuração de forma de pagamento
 * @interface PaymentMethodConfig
 */
interface PaymentMethodConfig {
    /** ID único da forma de pagamento */
    id: string;
    /** Nome da forma de pagamento */
    name: string;
    /** Tipo da forma de pagamento */
    type: PaymentType;
    /** Taxa percentual aplicada */
    tax: number;
    /** Se a forma de pagamento está ativa */
    active: boolean;
}

/**
 * Formulário de forma de pagamento
 * @interface PaymentMethodForm
 */
interface PaymentMethodForm {
    /** Nome da forma de pagamento */
    name: string;
    /** Tipo da forma de pagamento */
    type: PaymentType;
    /** Taxa percentual */
    tax: number;
    /** Status ativo/inativo */
    active: boolean;
}

/**
 * Parâmetros de configuração do sistema
 * @interface SystemParameters
 */
interface SystemParameters {
    /** Tolerância de divergência em reais */
    tolerance: string;
    /** Dias para estoque crítico */
    diasEstoqueCritico: string;
    /** Dias para estoque baixo */
    diasEstoqueBaixo: string;
}

/**
 * Resultado do reset do sistema
 * @interface ResetResult
 */
interface ResetResult {
    /** Se o reset foi bem-sucedido */
    success: boolean;
    /** Mensagem de retorno */
    message: string;
    /** Contagem de registros deletados por tabela */
    deletedCounts: Record<string, number>;
}
```

**Critérios de Aceite:**
- ✅ Todas as interfaces documentadas com JSDoc
- ✅ Todos os campos com comentários descritivos
- ✅ Tipos estritos (zero `any`)
- ✅ Comentário de rastreio `// [10/01 17:25]`

---

### 2. hooks/useConfiguracoesData.ts

**Responsabilidade:** Carregar todos os dados de configuração (produtos, bicos, formas de pagamento).

**Interface de Retorno:**
```typescript
interface UseConfiguracoesDataResult {
    products: ProductConfig[];
    nozzles: NozzleConfig[];
    paymentMethods: PaymentMethodConfig[];
    loading: boolean;
    error: Error | null;
    refreshData: () => Promise<void>;
}
```

**Implementação:**
```typescript
/**
 * Hook para carregar dados de configuração do posto.
 * Busca produtos, bicos e formas de pagamento do backend.
 * 
 * @param {number | null} postoId - ID do posto ativo
 * @returns {UseConfiguracoesDataResult} Dados de configuração e estado de loading
 * 
 * @example
 * ```tsx
 * const { products, nozzles, loading } = useConfiguracoesData(postoId);
 * ```
 */
export const useConfiguracoesData = (postoId: number | null): UseConfiguracoesDataResult => {
    // Implementação aqui
    // - useState para products, nozzles, paymentMethods, loading, error
    // - useEffect para carregar dados quando postoId mudar
    // - função refreshData para recarregar
    // - tratamento de erros
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Tipagem estrita
- ✅ Tratamento de erros
- ✅ Função de refresh
- ✅ Comentário de rastreio

---

### 3. hooks/useFormaPagamento.ts

**Responsabilidade:** Gerenciar CRUD de formas de pagamento e modal.

**Interface de Retorno:**
```typescript
interface UseFormaPagamentoResult {
    isModalOpen: boolean;
    editingPayment: PaymentMethodConfig | null;
    paymentForm: PaymentMethodForm;
    openModal: (method?: PaymentMethodConfig) => void;
    closeModal: () => void;
    updateForm: (field: keyof PaymentMethodForm, value: any) => void;
    savePayment: () => Promise<void>;
    deletePayment: (id: string) => Promise<void>;
    saving: boolean;
}
```

**Implementação:**
```typescript
/**
 * Hook para gerenciar formas de pagamento.
 * Controla modal, formulário e operações CRUD.
 * 
 * @param {number | null} postoId - ID do posto ativo
 * @param {PaymentMethodConfig[]} paymentMethods - Lista atual de formas de pagamento
 * @param {Function} onUpdate - Callback após atualização
 * @returns {UseFormaPagamentoResult} Controles do modal e CRUD
 */
export const useFormaPagamento = (
    postoId: number | null,
    paymentMethods: PaymentMethodConfig[],
    onUpdate: (methods: PaymentMethodConfig[]) => void
): UseFormaPagamentoResult => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ CRUD completo (create, update, delete)
- ✅ Gerenciamento de modal
- ✅ Validações
- ✅ Tratamento de erros

---

### 4. hooks/useParametros.ts

**Responsabilidade:** Gerenciar parâmetros de configuração.

**Interface de Retorno:**
```typescript
interface UseParametrosResult {
    tolerance: string;
    diasEstoqueCritico: string;
    diasEstoqueBaixo: string;
    modified: boolean;
    saving: boolean;
    updateTolerance: (value: string) => void;
    updateDiasCritico: (value: string) => void;
    updateDiasBaixo: (value: string) => void;
    saveParameters: () => Promise<void>;
}
```

**Implementação:**
```typescript
/**
 * Hook para gerenciar parâmetros de configuração do sistema.
 * Controla tolerância e alertas de estoque.
 * 
 * @param {number | null} postoId - ID do posto ativo
 * @returns {UseParametrosResult} Parâmetros e funções de atualização
 */
export const useParametros = (postoId: number | null): UseParametrosResult => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Carregamento inicial
- ✅ Detecção de modificações
- ✅ Salvamento em lote
- ✅ Feedback de sucesso/erro

---

### 5. hooks/useResetSistema.ts

**Responsabilidade:** Gerenciar reset do sistema.

**Interface de Retorno:**
```typescript
interface UseResetSistemaResult {
    showConfirm: boolean;
    confirmText: string;
    isResetting: boolean;
    openConfirm: () => void;
    closeConfirm: () => void;
    updateConfirmText: (text: string) => void;
    executeReset: () => Promise<void>;
}
```

**Implementação:**
```typescript
/**
 * Hook para gerenciar reset do sistema.
 * Controla modal de confirmação e execução do reset.
 * 
 * @param {number | null} postoId - ID do posto ativo
 * @returns {UseResetSistemaResult} Controles do reset
 */
export const useResetSistema = (postoId: number | null): UseResetSistemaResult => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Validação de segurança (texto "RESETAR")
- ✅ Execução do reset
- ✅ Feedback detalhado
- ✅ Reload após sucesso

---

### 6. components/GestaoProdutos.tsx

**Responsabilidade:** Exibir tabela de produtos.

**Props:**
```typescript
interface GestaoProdutosProps {
    products: ProductConfig[];
    onEdit?: (product: ProductConfig) => void;
    onDelete?: (productId: string) => void;
    onAdd?: () => void;
}
```

**Implementação:**
```typescript
/**
 * Componente de gestão de produtos.
 * Exibe tabela com produtos cadastrados e ações de CRUD.
 * 
 * @component
 * @param {GestaoProdutosProps} props - Props do componente
 * @returns {JSX.Element} Tabela de produtos
 */
export const GestaoProdutos: React.FC<GestaoProdutosProps> = ({ products, onEdit, onDelete, onAdd }) => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Tabela responsiva
- ✅ Botões de ação
- ✅ Estado vazio
- ✅ Cores por tipo de produto

---

### 7. components/GestaoBicos.tsx

**Responsabilidade:** Exibir tabela de bicos.

**Props:**
```typescript
interface GestaoBicosProps {
    nozzles: NozzleConfig[];
    onEdit?: (nozzle: NozzleConfig) => void;
    onDelete?: (nozzleId: string) => void;
    onAdd?: () => void;
}
```

**Implementação:**
```typescript
/**
 * Componente de gestão de bicos.
 * Exibe tabela com bicos configurados e suas associações.
 * 
 * @component
 * @param {GestaoBicosProps} props - Props do componente
 * @returns {JSX.Element} Tabela de bicos
 */
export const GestaoBicos: React.FC<GestaoBicosProps> = ({ nozzles, onEdit, onDelete, onAdd }) => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Tabela responsiva
- ✅ Badge circular com número do bico
- ✅ Informações de produto e tanque

---

### 8. components/GestaoFormasPagamento.tsx

**Responsabilidade:** Exibir tabela de formas de pagamento e modal.

**Props:**
```typescript
interface GestaoFormasPagamentoProps {
    paymentMethods: PaymentMethodConfig[];
    isModalOpen: boolean;
    editingPayment: PaymentMethodConfig | null;
    paymentForm: PaymentMethodForm;
    onOpenModal: (method?: PaymentMethodConfig) => void;
    onCloseModal: () => void;
    onUpdateForm: (field: keyof PaymentMethodForm, value: any) => void;
    onSave: () => Promise<void>;
    onDelete: (id: string) => Promise<void>;
    saving: boolean;
}
```

**Implementação:**
```typescript
/**
 * Componente de gestão de formas de pagamento.
 * Inclui tabela e modal de criação/edição.
 * 
 * @component
 * @param {GestaoFormasPagamentoProps} props - Props do componente
 * @returns {JSX.Element} Tabela e modal de formas de pagamento
 */
export const GestaoFormasPagamento: React.FC<GestaoFormasPagamentoProps> = (props) => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Tabela com status ativo/inativo
- ✅ Modal responsivo
- ✅ Validações de formulário
- ✅ Feedback visual

---

### 9. components/ParametrosFechamento.tsx

**Responsabilidade:** Card de parâmetros de fechamento.

**Props:**
```typescript
interface ParametrosFechamentoProps {
    tolerance: string;
    onToleranceChange: (value: string) => void;
}
```

**Implementação:**
```typescript
/**
 * Componente de parâmetros de fechamento.
 * Exibe e permite editar tolerância de divergência.
 * 
 * @component
 * @param {ParametrosFechamentoProps} props - Props do componente
 * @returns {JSX.Element} Card de parâmetros
 */
export const ParametrosFechamento: React.FC<ParametrosFechamentoProps> = ({ tolerance, onToleranceChange }) => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Input monetário
- ✅ Ícone e descrição
- ✅ Validação de valor

---

### 10. components/ParametrosEstoque.tsx

**Responsabilidade:** Card de parâmetros de estoque.

**Props:**
```typescript
interface ParametrosEstoqueProps {
    diasCritico: string;
    diasBaixo: string;
    onDiasCriticoChange: (value: string) => void;
    onDiasBaixoChange: (value: string) => void;
}
```

**Implementação:**
```typescript
/**
 * Componente de parâmetros de estoque.
 * Configura alertas de estoque crítico e baixo.
 * 
 * @component
 * @param {ParametrosEstoqueProps} props - Props do componente
 * @returns {JSX.Element} Card de parâmetros de estoque
 */
export const ParametrosEstoque: React.FC<ParametrosEstoqueProps> = (props) => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Dois inputs numéricos
- ✅ Descrições claras
- ✅ Validação de valores

---

### 11. components/ModalResetSistema.tsx

**Responsabilidade:** Modal de confirmação de reset.

**Props:**
```typescript
interface ModalResetSistemaProps {
    isOpen: boolean;
    confirmText: string;
    isResetting: boolean;
    onClose: () => void;
    onConfirmTextChange: (text: string) => void;
    onReset: () => Promise<void>;
}
```

**Implementação:**
```typescript
/**
 * Modal de confirmação para reset do sistema.
 * Requer digitação de "RESETAR" para confirmar.
 * 
 * @component
 * @param {ModalResetSistemaProps} props - Props do componente
 * @returns {JSX.Element | null} Modal de reset ou null
 */
export const ModalResetSistema: React.FC<ModalResetSistemaProps> = (props) => {
    // Implementação aqui
}
```

**Critérios de Aceite:**
- ✅ JSDoc completo
- ✅ Validação de texto
- ✅ Avisos de segurança
- ✅ Loading state
- ✅ Botão desabilitado até validação

---

### 12. TelaConfiguracoes.tsx (Principal)

**Responsabilidade:** Orquestrar todos os componentes e hooks.

**Estrutura:**
```typescript
/**
 * Tela de Configurações do Posto
 * 
 * Componente principal que gerencia todas as configurações do sistema:
 * produtos, bicos, formas de pagamento, parâmetros e reset.
 * 
 * @component
 * @returns {JSX.Element} Tela completa de configurações
 * 
 * @remarks
 * Este componente foi refatorado de 983 linhas para uma arquitetura modular
 * com 4 hooks e 6 componentes especializados.
 */
export const TelaConfiguracoes: React.FC = () => {
    const { postoAtivoId } = usePosto();
    
    // Hooks
    const { products, nozzles, paymentMethods, loading } = useConfiguracoesData(postoId);
    const formaPagamento = useFormaPagamento(postoId, paymentMethods, updatePaymentMethods);
    const parametros = useParametros(postoId);
    const resetSistema = useResetSistema(postoId);
    
    // Render
    return (
        <div>
            {/* Header */}
            {/* TankManagement */}
            <div className="grid">
                <div>
                    <GestaoProdutos products={products} />
                    <GestaoBicos nozzles={nozzles} />
                </div>
                <div>
                    <GestaoFormasPagamento {...formaPagamento} />
                </div>
            </div>
            <div>
                <ParametrosFechamento {...parametros} />
                <ParametrosEstoque {...parametros} />
                {/* Botão salvar se modificado */}
            </div>
            <ModalResetSistema {...resetSistema} />
        </div>
    );
};
```

**Critérios de Aceite:**
- ✅ < 200 linhas
- ✅ JSDoc completo com @remarks
- ✅ Usa todos os hooks
- ✅ Renderiza todos os componentes
- ✅ Layout responsivo mantido

---

### 13. index.ts

**Responsabilidade:** Barrel export para facilitar imports.

```typescript
// [10/01 17:25] Barrel export do módulo de configurações
export { TelaConfiguracoes } from './TelaConfiguracoes';
export * from './types';
```

---

## 🔄 Fluxo de Implementação

### Fase 1: Preparação (30 min)
1. ✅ Criar estrutura de pastas
2. ✅ Criar `types.ts` com todas as interfaces
3. ✅ Adicionar JSDoc em `types.ts`
4. ✅ Commit: `refactor(config): cria estrutura e tipos (#16)`

### Fase 2: Hooks (2 horas)
1. ✅ Criar `useConfiguracoesData.ts`
2. ✅ Criar `useFormaPagamento.ts`
3. ✅ Criar `useParametros.ts`
4. ✅ Criar `useResetSistema.ts`
5. ✅ Adicionar JSDoc em todos
6. ✅ Commit: `refactor(config): adiciona hooks customizados (#16)`

### Fase 3: Componentes (3 horas)
1. ✅ Criar `GestaoProdutos.tsx`
2. ✅ Criar `GestaoBicos.tsx`
3. ✅ Criar `GestaoFormasPagamento.tsx`
4. ✅ Criar `ParametrosFechamento.tsx`
5. ✅ Criar `ParametrosEstoque.tsx`
6. ✅ Criar `ModalResetSistema.tsx`
7. ✅ Adicionar JSDoc em todos
8. ✅ Commit: `refactor(config): adiciona componentes de UI (#16)`

### Fase 4: Integração (1 hora)
1. ✅ Refatorar `TelaConfiguracoes.tsx` principal
2. ✅ Criar `index.ts`
3. ✅ Atualizar imports em `App.tsx`
4. ✅ Verificar build
5. ✅ Commit: `refactor(config): integra componentes e hooks (#16)`

### Fase 5: Finalização (30 min)
1. ✅ Testar todas as funcionalidades
2. ✅ Verificar conformidade com `.cursorrules`
3. ✅ Push para branch
4. ✅ Fechar Issue #16

**Tempo Total Estimado:** 7 horas

---

## ✅ Critérios de Aceite Gerais

### Conformidade com .cursorrules
- ✅ **Idioma:** PT-BR em toda documentação
- ✅ **JSDoc:** Obrigatório em todos os arquivos
- ✅ **Rastreio:** Comentários `// [DD/MM HH:mm]` em todos os arquivos
- ✅ **TypeScript:** Zero `any`, tipagem estrita
- ✅ **Git:** Commits semânticos, branch vinculada a #16

### Qualidade de Código
- ✅ Build passando sem erros TypeScript
- ✅ Zero breaking changes
- ✅ Funcionalidade 100% preservada
- ✅ Componentes testáveis
- ✅ Hooks reutilizáveis

### Métricas
- ✅ Arquivo principal: < 200 linhas (era 983)
- ✅ Módulos criados: 13 arquivos
- ✅ Redução: ~85% no arquivo principal
- ✅ Cobertura JSDoc: 100%
- ✅ Usos de `any`: 0

---

## 📚 Referências

### Documentos do Projeto
- `.cursorrules` - Regras de desenvolvimento
- `SPRINT-2-COMPONENTES-CRITICOS.md` - Plano da sprint
- `PRD-013-refatoracao-strategic-dashboard.md` - Padrão de referência

### Issues Relacionadas
- Issue #13 - StrategicDashboard.tsx (CONCLUÍDO) ✅
- Issue #16 - TelaConfiguracoes.tsx (ESTE)
- Issue #15 - TelaGestaoClientes.tsx (PRÓXIMO)

### Commits de Referência
- `7cee64d` - Estrutura e tipos (#13)
- `71f47dc` - Eliminação de `any` (#13)
- `14ec927` - JSDoc completo (#13)

---

## 🎯 Checklist Final

Antes de fechar a Issue #16, verificar:

- [ ] ✅ Estrutura de pastas criada
- [ ] ✅ 13 arquivos criados
- [ ] ✅ Zero `any` no código
- [ ] ✅ JSDoc 100% completo
- [ ] ✅ Rastreio em todos os arquivos
- [ ] ✅ Build passando
- [ ] ✅ Funcionalidade preservada
- [ ] ✅ Commits semânticos
- [ ] ✅ Push para branch
- [ ] ✅ Issue fechada com comentário

---

## 📝 Notas para o Agente Executor

### Importante
1. **Seguir EXATAMENTE o padrão da Issue #13**
2. **Não pular etapas de documentação**
3. **Testar após cada fase**
4. **Fazer commits incrementais**
5. **Validar build frequentemente**

### Dicas
- Use o arquivo original como referência para lógica
- Mantenha os mesmos nomes de variáveis quando possível
- Preserve toda a lógica de negócio
- Não altere comportamentos, apenas estrutura
- Em caso de dúvida, consulte Issue #13

### Comandos Úteis
```bash
# Criar branch (se necessário)
git checkout refactor/tech-debt

# Verificar build
npm run build

# Commit
git add -A
git commit -m "refactor(config): <mensagem> (#16)"

# Push
git push origin refactor/tech-debt
```

---

**BOA SORTE! 🚀**

Este PRD contém TUDO que você precisa para executar a refatoração com sucesso.
Siga passo a passo e você terá um código de qualidade excepcional!
