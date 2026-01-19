# 📚 Guia de Hooks Customizados do Sistema

**Data:** 11/01/2026  
**Versão:** 1.0  
**Autor:** Sistema de Refatoração

---

## 📋 Índice

1. [Introdução](#introdução)
2. [Padrões e Convenções](#padrões-e-convenções)
3. [Hooks por Módulo](#hooks-por-módulo)
   - [Dashboard Estratégico (AI)](#dashboard-estratégico-ai)
   - [Configurações](#configurações)
   - [Gestão de Clientes](#gestão-de-clientes)
4. [Exemplos de Uso](#exemplos-de-uso)
5. [Boas Práticas](#boas-práticas)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Introdução

Este guia documenta todos os **hooks customizados** criados durante a refatoração do sistema (Sprint 2). Os hooks foram desenvolvidos seguindo o padrão estabelecido nas Issues #13, #16 e #15, com foco em:

- ✅ **Separação de responsabilidades** - Lógica de negócio separada da UI
- ✅ **Reusabilidade** - Hooks podem ser usados em múltiplos componentes
- ✅ **Type Safety** - TypeScript 100% estrito, zero `any`
- ✅ **Documentação** - JSDoc completo em todos os hooks
- ✅ **Testabilidade** - Hooks isolados e fáceis de testar

### Estatísticas Gerais

| Módulo | Hooks | Linhas Totais | Responsabilidades |
|--------|-------|---------------|-------------------|
| **Dashboard AI** | 6 | ~26.500 bytes | Métricas, insights, promoções, alertas |
| **Configurações** | 4 | ~12.200 bytes | Dados, formulários, parâmetros, reset |
| **Clientes** | 4 | ~11.200 bytes | CRUD, notas, pagamentos |
| **TOTAL** | **14** | **~50 KB** | Lógica de negócio modularizada |

---

## 🎨 Padrões e Convenções

### Nomenclatura
```typescript
// Padrão: use + [Domínio] + [Ação/Recurso]
useClientesData()      // Carrega dados de clientes
useClienteForm()       // Gerencia formulário de cliente
useDashboardMetrics()  // Calcula métricas do dashboard
useFormaPagamento()    // CRUD de formas de pagamento
```

### Estrutura Padrão
```typescript
/**
 * Descrição do hook.
 * Explica o que faz e quando usar.
 * 
 * @param parametro - Descrição do parâmetro
 * @returns Objeto com estado e funções
 */
export function useNomeDoHook(parametro: Tipo) {
    // 1. Estados locais
    const [estado, setEstado] = useState<Tipo>(valorInicial);
    
    // 2. Hooks de contexto (se necessário)
    const { postoAtivoId } = usePosto();
    
    // 3. Funções auxiliares
    const funcaoAuxiliar = useCallback(async () => {
        // Lógica
    }, [dependencias]);
    
    // 4. Efeitos colaterais
    useEffect(() => {
        funcaoAuxiliar();
    }, [funcaoAuxiliar]);
    
    // 5. Retorno (sempre um objeto)
    return {
        estado,
        funcaoAuxiliar,
        // ... outros valores
    };
}
```

### Retorno Consistente
Todos os hooks retornam um **objeto** (não array) para facilitar desestruturação seletiva:

```typescript
// ✅ BOM - Permite pegar apenas o que precisa
const { clientes, loading } = useClientesData(postoId);

// ❌ EVITAR - Força pegar tudo na ordem
const [clientes, loading, resumo, refresh] = useClientesData(postoId);
```

---

## 📦 Hooks por Módulo

---

## 1️⃣ Dashboard Estratégico (AI)

**Localização:** `src/components/ai/strategic-dashboard/hooks/`

### 1.1 useDashboardMetrics

**Arquivo:** `useDashboardMetrics.ts` (4.291 bytes)

**Responsabilidade:** Busca e calcula as métricas principais do dashboard estratégico.

**Funcionalidades:**
- Compara mês atual com mês anterior
- Calcula receita projetada
- Calcula variações de receita, volume e margem
- Calcula score de eficiência

**Parâmetros:**
- Nenhum (usa `postoAtivoId` do contexto)

**Retorno:**
```typescript
{
    metrics: DashboardMetrics | null;      // Métricas calculadas
    loading: boolean;                       // Estado de carregamento
    currentAnalysis: SalesAnalysisData | null; // Dados brutos
    refreshMetrics: () => Promise<void>;    // Função de refresh
}
```

**Exemplo de Uso:**
```typescript
import { useDashboardMetrics } from './hooks';

const MeuComponente = () => {
    const { metrics, loading, refreshMetrics } = useDashboardMetrics();
    
    if (loading) return <Loading />;
    
    return (
        <div>
            <h1>Receita Projetada: {metrics?.receitaProjetada}</h1>
            <button onClick={refreshMetrics}>Atualizar</button>
        </div>
    );
};
```

**Quando Usar:**
- Quando precisar exibir métricas financeiras do dashboard
- Para comparações mês a mês
- Para cálculos de projeção de receita

---

### 1.2 useWeeklyVolume

**Arquivo:** `useWeeklyVolume.ts` (4.095 bytes)

**Responsabilidade:** Busca e processa dados de volume de vendas semanal.

**Funcionalidades:**
- Carrega dados dos últimos 7 dias
- Agrupa por dia da semana
- Formata para gráficos

**Retorno:**
```typescript
{
    weeklyData: WeeklyVolumeData[];    // Dados semanais
    loading: boolean;                   // Estado de carregamento
    refreshWeekly: () => Promise<void>; // Função de refresh
}
```

**Exemplo de Uso:**
```typescript
const { weeklyData, loading } = useWeeklyVolume();

return (
    <BarChart data={weeklyData} />
);
```

---

### 1.3 useAIInsights

**Arquivo:** `useAIInsights.ts` (4.383 bytes)

**Responsabilidade:** Gera insights inteligentes baseados em dados de vendas.

**Funcionalidades:**
- Analisa tendências de vendas
- Identifica padrões
- Gera recomendações automáticas

**Retorno:**
```typescript
{
    insights: AIInsight[];              // Lista de insights
    loading: boolean;                   // Estado de carregamento
    refreshInsights: () => Promise<void>; // Função de refresh
}
```

---

### 1.4 useStockAlerts

**Arquivo:** `useStockAlerts.ts` (2.789 bytes)

**Responsabilidade:** Monitora alertas de estoque crítico e baixo.

**Funcionalidades:**
- Verifica níveis de estoque
- Gera alertas automáticos
- Calcula dias restantes

**Retorno:**
```typescript
{
    alerts: StockAlert[];               // Lista de alertas
    loading: boolean;                   // Estado de carregamento
    refreshAlerts: () => Promise<void>; // Função de refresh
}
```

---

### 1.5 useTopPerformers

**Arquivo:** `useTopPerformers.ts` (3.507 bytes)

**Responsabilidade:** Identifica os frentistas com melhor desempenho.

**Funcionalidades:**
- Rankeia frentistas por vendas
- Calcula métricas de performance
- Identifica top performers

**Retorno:**
```typescript
{
    topPerformers: PerformerData[];     // Top frentistas
    loading: boolean;                   // Estado de carregamento
    refreshPerformers: () => Promise<void>; // Função de refresh
}
```

---

### 1.6 useAIPromotion

**Arquivo:** `useAIPromotion.ts` (7.497 bytes)

**Responsabilidade:** Simula e gerencia promoções inteligentes.

**Funcionalidades:**
- Simula impacto de promoções
- Calcula ROI estimado
- Sugere melhores períodos

**Retorno:**
```typescript
{
    simulation: PromotionSimulation | null; // Simulação atual
    loading: boolean;                       // Estado de carregamento
    runSimulation: (params: PromotionParams) => Promise<void>; // Executar simulação
}
```

---

## 2️⃣ Configurações

**Localização:** `src/components/configuracoes/hooks/`

### 2.1 useConfiguracoesData

**Arquivo:** `useConfiguracoesData.ts` (1.601 bytes)

**Responsabilidade:** Carrega dados iniciais da tela de configurações.

**Funcionalidades:**
- Carrega produtos (combustíveis)
- Carrega bicos
- Carrega formas de pagamento

**Parâmetros:**
- Nenhum (usa `postoAtivoId` do contexto)

**Retorno:**
```typescript
{
    products: Produto[];                // Lista de produtos
    nozzles: Bico[];                    // Lista de bicos
    paymentMethods: FormaPagamento[];   // Formas de pagamento
    setPaymentMethods: Dispatch<SetStateAction<FormaPagamento[]>>; // Setter
    loading: boolean;                   // Estado de carregamento
    refetch: () => Promise<void>;       // Função de refresh
}
```

**Exemplo de Uso:**
```typescript
const { products, nozzles, paymentMethods, loading } = useConfiguracoesData();

if (loading) return <Skeleton />;

return (
    <>
        <GestaoProdutos products={products} />
        <GestaoBicos nozzles={nozzles} />
        <GestaoFormasPagamento methods={paymentMethods} />
    </>
);
```

**Quando Usar:**
- Na tela de configurações
- Quando precisar listar produtos, bicos ou formas de pagamento
- Para inicializar dados de configuração

---

### 2.2 useFormaPagamento

**Arquivo:** `useFormaPagamento.ts` (5.306 bytes)

**Responsabilidade:** Gerencia CRUD completo de formas de pagamento.

**Funcionalidades:**
- Criar nova forma de pagamento
- Editar forma existente
- Alternar status (ativo/inativo)
- Gerenciar modal de formulário
- Validações de formulário

**Parâmetros:**
```typescript
postoId: string | undefined;
setPaymentMethods: Dispatch<SetStateAction<FormaPagamento[]>>;
```

**Retorno:**
```typescript
{
    isPaymentModalOpen: boolean;        // Estado do modal
    editingPayment: FormaPagamento | null; // Forma sendo editada
    paymentForm: PaymentFormState;      // Dados do formulário
    openPaymentModal: (method?: FormaPagamento) => void; // Abrir modal
    setIsPaymentModalOpen: (open: boolean) => void; // Controlar modal
    handleFormChange: (field: keyof PaymentFormState, value: string | number | boolean) => void; // Alterar campo
    handleSavePayment: () => Promise<void>; // Salvar
    handleToggleStatus: (id: string, currentStatus: boolean) => Promise<void>; // Alternar status
}
```

**Exemplo de Uso:**
```typescript
const {
    isPaymentModalOpen,
    editingPayment,
    paymentForm,
    openPaymentModal,
    handleSavePayment,
    handleFormChange
} = useFormaPagamento(postoId, setPaymentMethods);

return (
    <>
        <button onClick={() => openPaymentModal()}>Nova Forma</button>
        
        <ModalFormaPagamento
            isOpen={isPaymentModalOpen}
            editingPayment={editingPayment}
            formData={paymentForm}
            onSave={handleSavePayment}
            onChange={handleFormChange}
        />
    </>
);
```

---

### 2.3 useParametros

**Arquivo:** `useParametros.ts` (3.077 bytes)

**Responsabilidade:** Gerencia parâmetros de configuração (tolerância, estoque).

**Funcionalidades:**
- Gerencia tolerância de divergência
- Gerencia dias de estoque crítico/baixo
- Detecta modificações
- Salva em lote

**Parâmetros:**
```typescript
postoId: string | undefined;
```

**Retorno:**
```typescript
{
    tolerance: string;                  // Tolerância atual
    diasEstoqueCritico: string;         // Dias estoque crítico
    diasEstoqueBaixo: string;           // Dias estoque baixo
    configsModified: boolean;           // Se foi modificado
    updateTolerance: (value: string) => void; // Atualizar tolerância
    updateDiasCritico: (value: string) => void; // Atualizar dias crítico
    updateDiasBaixo: (value: string) => void; // Atualizar dias baixo
    handleSaveConfigs: () => Promise<void>; // Salvar tudo
}
```

**Exemplo de Uso:**
```typescript
const {
    tolerance,
    diasEstoqueCritico,
    configsModified,
    updateTolerance,
    handleSaveConfigs
} = useParametros(postoId);

return (
    <>
        <Input value={tolerance} onChange={e => updateTolerance(e.target.value)} />
        
        {configsModified && (
            <button onClick={handleSaveConfigs}>Salvar Alterações</button>
        )}
    </>
);
```

---

### 2.4 useResetSistema

**Arquivo:** `useResetSistema.ts` (2.208 bytes)

**Responsabilidade:** Gerencia o reset completo do sistema.

**Funcionalidades:**
- Gerencia modal de confirmação
- Validação de segurança ("RESETAR")
- Execução de reset
- Feedback detalhado

**Parâmetros:**
```typescript
postoId: string | undefined;
```

**Retorno:**
```typescript
{
    isResetModalOpen: boolean;          // Estado do modal
    isResetting: boolean;               // Se está executando
    openResetModal: () => void;         // Abrir modal
    closeResetModal: () => void;        // Fechar modal
    handleReset: (confirmText: string) => Promise<void>; // Executar reset
}
```

**Exemplo de Uso:**
```typescript
const {
    isResetModalOpen,
    isResetting,
    openResetModal,
    handleReset
} = useResetSistema(postoId);

return (
    <>
        <button onClick={openResetModal} className="danger">
            RESETAR SISTEMA
        </button>
        
        <ModalResetSistema
            isOpen={isResetModalOpen}
            isResetting={isResetting}
            onConfirm={handleReset}
        />
    </>
);
```

---

## 3️⃣ Gestão de Clientes

**Localização:** `src/components/clientes/hooks/`

### 3.1 useClientesData

**Arquivo:** `useClientesData.ts` (1.902 bytes)

**Responsabilidade:** Carrega e gerencia dados de clientes.

**Funcionalidades:**
- Carrega clientes com saldo devedor
- Calcula resumo financeiro
- Ordena por nome
- Gerencia estado de loading

**Parâmetros:**
```typescript
postoId: number | undefined;
```

**Retorno:**
```typescript
{
    clientes: ClienteComSaldo[];        // Lista de clientes
    loading: boolean;                   // Estado de carregamento
    resumo: ClientesResumoData;         // Resumo financeiro
    refreshClientes: () => Promise<void>; // Função de refresh
}
```

**Exemplo de Uso:**
```typescript
const { clientes, loading, resumo, refreshClientes } = useClientesData(postoId);

return (
    <>
        <ClientesResumo resumo={resumo} loading={loading} />
        <ClientesLista clientes={clientes} loading={loading} />
        <button onClick={refreshClientes}>Atualizar</button>
    </>
);
```

**Quando Usar:**
- Na tela de gestão de clientes
- Quando precisar listar clientes com saldo
- Para calcular totais de devedores

---

### 3.2 useClienteForm

**Arquivo:** `useClienteForm.ts` (3.101 bytes)

**Responsabilidade:** Gerencia formulário de cliente (criar/editar).

**Funcionalidades:**
- CRUD completo de clientes
- Modo criação/edição
- Validações de formulário
- Gerenciamento de modal

**Parâmetros:**
```typescript
postoId: number | undefined;
onSuccess: () => void; // Callback após salvar
```

**Retorno:**
```typescript
{
    isOpen: boolean;                    // Estado do modal
    editingId: number | null;           // ID sendo editado
    formData: ClienteFormData;          // Dados do formulário
    openModal: (cliente?: ClienteComSaldo) => void; // Abrir modal
    onClose: () => void;                // Fechar modal
    onChange: (field: keyof ClienteFormData, value: string) => void; // Alterar campo
    onSave: () => Promise<void>;        // Salvar
}
```

**Exemplo de Uso:**
```typescript
const clienteForm = useClienteForm(postoId, () => {
    refreshClientes(); // Recarregar lista após salvar
});

return (
    <>
        <button onClick={() => clienteForm.openModal()}>
            Novo Cliente
        </button>
        
        <ModalCliente
            isOpen={clienteForm.isOpen}
            editingId={clienteForm.editingId}
            formData={clienteForm.formData}
            onClose={clienteForm.onClose}
            onSave={clienteForm.onSave}
            onChange={clienteForm.onChange}
        />
    </>
);
```

---

### 3.3 useNotaFrentista

**Arquivo:** `useNotaFrentista.ts` (4.410 bytes)

**Responsabilidade:** Gerencia notas de fiado (criar, listar).

**Funcionalidades:**
- Carrega notas do cliente
- Carrega lista de frentistas
- Cria nova nota
- Suporta pagamento imediato
- Gerencia modal de nova nota

**Parâmetros:**
```typescript
clienteId: number | null;
postoId: number | undefined;
onSuccess: () => void; // Callback após criar nota
```

**Retorno:**
```typescript
{
    notas: NotaFrentistaComRelacoes[];  // Lista de notas
    loadingNotas: boolean;              // Estado de carregamento
    isModalOpen: boolean;               // Estado do modal
    formData: NotaFormData;             // Dados do formulário
    frentistas: Frentista[];            // Lista de frentistas
    saving: boolean;                    // Se está salvando
    openModal: () => void;              // Abrir modal
    closeModal: () => void;             // Fechar modal
    onChange: (field: keyof NotaFormData, value: string | boolean) => void; // Alterar campo
    onSave: () => Promise<void>;        // Salvar
    refreshNotas: () => Promise<void>;  // Recarregar notas
}
```

**Exemplo de Uso:**
```typescript
const notaForm = useNotaFrentista(
    selectedCliente?.id || null,
    postoId,
    () => {
        refreshClientes(); // Atualizar saldo do cliente
    }
);

return (
    <>
        <NotasLista notas={notaForm.notas} loading={notaForm.loadingNotas} />
        
        <button onClick={notaForm.openModal}>Nova Nota</button>
        
        <ModalNovaNota
            isOpen={notaForm.isModalOpen}
            formData={notaForm.formData}
            frentistas={notaForm.frentistas}
            onClose={notaForm.closeModal}
            onSave={notaForm.onSave}
            onChange={notaForm.onChange}
            saving={notaForm.saving}
        />
    </>
);
```

---

### 3.4 usePagamento

**Arquivo:** `usePagamento.ts` (1.781 bytes)

**Responsabilidade:** Gerencia pagamentos de notas.

**Funcionalidades:**
- Gerencia modal de pagamento
- Validação de dados
- Registro de pagamento
- Feedback de sucesso

**Parâmetros:**
```typescript
onSuccess: () => void; // Callback após registrar pagamento
```

**Retorno:**
```typescript
{
    isOpen: boolean;                    // Estado do modal
    formData: PagamentoFormData;        // Dados do formulário
    openModal: (notaId: number) => void; // Abrir modal
    closeModal: () => void;             // Fechar modal
    onChange: (field: keyof PagamentoFormData, value: string) => void; // Alterar campo
    onConfirm: () => Promise<void>;     // Confirmar pagamento
}
```

**Exemplo de Uso:**
```typescript
const pagamentoForm = usePagamento(() => {
    notaForm.refreshNotas();  // Recarregar notas
    refreshClientes();        // Atualizar saldo
});

return (
    <>
        <NotasLista
            notas={notas}
            onPagamento={pagamentoForm.openModal} // Passar notaId
        />
        
        <ModalPagamento
            isOpen={pagamentoForm.isOpen}
            formData={pagamentoForm.formData}
            onClose={pagamentoForm.closeModal}
            onConfirm={pagamentoForm.onConfirm}
            onChange={pagamentoForm.onChange}
        />
    </>
);
```

---

## 💡 Exemplos de Uso Completos

### Exemplo 1: Tela de Configurações

```typescript
import React from 'react';
import { usePosto } from '../../contexts/PostoContext';
import {
    useConfiguracoesData,
    useFormaPagamento,
    useParametros,
    useResetSistema
} from './hooks';
import {
    GestaoProdutos,
    GestaoBicos,
    GestaoFormasPagamento,
    ParametrosFechamento,
    ParametrosEstoque,
    ModalResetSistema
} from './components';

const TelaConfiguracoes: React.FC = () => {
    const { postoAtivoId } = usePosto();
    
    // Hooks de dados
    const { 
        products, 
        nozzles, 
        paymentMethods, 
        setPaymentMethods, 
        loading 
    } = useConfiguracoesData();
    
    // Hooks de formulários
    const { 
        tolerance, 
        diasEstoqueCritico, 
        diasEstoqueBaixo, 
        configsModified,
        updateTolerance,
        updateDiasCritico,
        updateDiasBaixo,
        handleSaveConfigs 
    } = useParametros(postoAtivoId);
    
    const { 
        isResetModalOpen, 
        isResetting, 
        openResetModal, 
        closeResetModal, 
        handleReset 
    } = useResetSistema(postoAtivoId);

    const {
        isPaymentModalOpen,
        editingPayment,
        paymentForm,
        openPaymentModal,
        setIsPaymentModalOpen,
        handleFormChange,
        handleSavePayment,
        handleToggleStatus
    } = useFormaPagamento(postoAtivoId, setPaymentMethods);

    return (
        <div className="flex h-screen bg-gray-50">
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-16 bg-white border-b flex items-center justify-between px-6">
                    <h1 className="text-xl font-bold">Configurações</h1>
                    
                    {configsModified && (
                        <button onClick={handleSaveConfigs} className="btn-primary">
                            Salvar Alterações
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Coluna Esquerda */}
                            <div className="space-y-6">
                                <GestaoProdutos products={products} loading={loading} />
                                <GestaoBicos nozzles={nozzles} loading={loading} />
                            </div>

                            {/* Coluna Direita */}
                            <div className="space-y-6">
                                <GestaoFormasPagamento
                                    paymentMethods={paymentMethods}
                                    loading={loading}
                                    onAdd={() => openPaymentModal()}
                                    onEdit={(method) => openPaymentModal(method)}
                                    onToggleStatus={handleToggleStatus}
                                    modal={{
                                        isOpen: isPaymentModalOpen,
                                        editingPayment,
                                        formData: paymentForm,
                                        onClose: () => setIsPaymentModalOpen(false),
                                        onSave: handleSavePayment,
                                        onChange: handleFormChange
                                    }}
                                />

                                <ParametrosFechamento
                                    tolerance={tolerance}
                                    saving={false}
                                    modified={configsModified}
                                    onChange={updateTolerance}
                                    onSave={handleSaveConfigs}
                                />

                                <ParametrosEstoque
                                    diasCritico={diasEstoqueCritico}
                                    diasBaixo={diasEstoqueBaixo}
                                    saving={false}
                                    modified={configsModified}
                                    onChangeCritico={updateDiasCritico}
                                    onChangeBaixo={updateDiasBaixo}
                                    onSave={handleSaveConfigs}
                                />

                                <div className="bg-red-50 rounded-xl border border-red-100 p-6">
                                    <h3 className="text-red-800 font-bold mb-2">Zona de Perigo</h3>
                                    <button onClick={openResetModal} className="btn-danger">
                                        RESETAR SISTEMA COMPLETO
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ModalResetSistema
                    isOpen={isResetModalOpen}
                    isResetting={isResetting}
                    onClose={closeResetModal}
                    onConfirm={handleReset}
                />
            </main>
        </div>
    );
};

export default TelaConfiguracoes;
```

### Exemplo 2: Tela de Gestão de Clientes

```typescript
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePosto } from '../../contexts/PostoContext';
import { ClienteComSaldo } from './types';
import {
    useClientesData,
    useClienteForm,
    useNotaFrentista,
    usePagamento
} from './hooks';
import {
    ClientesResumo,
    ClientesLista,
    ClienteDetalhes,
    ModalCliente,
    ModalNovaNota,
    ModalPagamento
} from './components';

const TelaGestaoClientes: React.FC = () => {
    const { postoAtivo } = usePosto();
    
    // Hooks de dados
    const { clientes, loading, resumo, refreshClientes } = useClientesData(postoAtivo?.id);
    
    // Estado local
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<ClienteComSaldo | null>(null);

    // Hooks de formulários
    const clienteForm = useClienteForm(postoAtivo?.id, refreshClientes);
    
    const notaForm = useNotaFrentista(
        selectedCliente?.id || null,
        postoAtivo?.id,
        refreshClientes
    );

    const pagamentoForm = usePagamento(() => {
        notaForm.refreshNotas();
        refreshClientes();
    });
    
    // Handlers
    const handleClienteClick = (cliente: ClienteComSaldo) => {
        setSelectedCliente(cliente);
    };

    const handleBloquear = async () => {
        // Lógica de bloqueio
        refreshClientes();
    };

    const handleApagar = async () => {
        // Lógica de exclusão
        setSelectedCliente(null);
        refreshClientes();
    };
    
    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Clientes & Fiado</h1>
                    <p className="text-gray-500">Gerencie contas, limites e recebimentos</p>
                </div>
                <button onClick={() => clienteForm.openModal()} className="btn-primary">
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>
            
            <ClientesResumo resumo={resumo} loading={loading} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ClientesLista
                    clientes={clientes}
                    loading={loading}
                    searchTerm={searchTerm}
                    selectedClienteId={selectedCliente?.id || null}
                    onSearchChange={setSearchTerm}
                    onClienteClick={handleClienteClick}
                />
                
                <ClienteDetalhes
                    cliente={selectedCliente}
                    notas={notaForm.notas}
                    loadingNotas={notaForm.loadingNotas}
                    onNovaNota={notaForm.openModal}
                    onEditarCliente={() => clienteForm.openModal(selectedCliente)}
                    onBloquear={handleBloquear}
                    onApagar={handleApagar}
                    onPagamento={pagamentoForm.openModal}
                />
            </div>
            
            {/* Modais */}
            <ModalCliente {...clienteForm} />
            <ModalNovaNota {...notaForm} />
            <ModalPagamento {...pagamentoForm} />
        </div>
    );
};

export default TelaGestaoClientes;
```

---

## 🎯 Boas Práticas

### 1. Sempre Use TypeScript Estrito
```typescript
// ✅ BOM
const [clientes, setClientes] = useState<ClienteComSaldo[]>([]);

// ❌ EVITAR
const [clientes, setClientes] = useState<any>([]);
```

### 2. Use useCallback para Funções
```typescript
// ✅ BOM - Evita re-renderizações desnecessárias
const loadData = useCallback(async () => {
    // ...
}, [postoId]);

// ❌ EVITAR - Cria nova função a cada render
const loadData = async () => {
    // ...
};
```

### 3. Sempre Documente com JSDoc
```typescript
/**
 * Hook para gerenciar clientes.
 * 
 * @param postoId - ID do posto ativo
 * @returns Objeto com clientes, loading e refresh
 */
export function useClientesData(postoId: number | undefined) {
    // ...
}
```

### 4. Retorne Objetos, Não Arrays
```typescript
// ✅ BOM - Permite desestruturação seletiva
return {
    clientes,
    loading,
    refreshClientes
};

// ❌ EVITAR - Força ordem específica
return [clientes, loading, refreshClientes];
```

### 5. Use Callbacks para Comunicação
```typescript
// ✅ BOM - Hook recebe callback de sucesso
const clienteForm = useClienteForm(postoId, () => {
    refreshClientes(); // Executado após salvar
});

// ❌ EVITAR - Hook chama diretamente outro hook
// (cria acoplamento desnecessário)
```

### 6. Gerencie Loading States
```typescript
// ✅ BOM - Sempre tenha loading state
const [loading, setLoading] = useState(true);

const loadData = async () => {
    setLoading(true);
    try {
        // ...
    } finally {
        setLoading(false); // Sempre no finally
    }
};
```

### 7. Trate Erros Adequadamente
```typescript
// ✅ BOM - Trata erros e mostra feedback
try {
    await api.save(data);
    toast.success('Salvo com sucesso!');
} catch (error) {
    console.error('Erro ao salvar:', error);
    toast.error('Erro ao salvar');
}
```

---

## 🔧 Troubleshooting

### Problema: Hook não atualiza quando props mudam

**Solução:** Adicione a prop nas dependências do `useEffect`

```typescript
// ❌ PROBLEMA
useEffect(() => {
    loadData();
}, []); // Não atualiza quando postoId muda

// ✅ SOLUÇÃO
useEffect(() => {
    loadData();
}, [loadData]); // Atualiza quando loadData muda

// Ou use useCallback
const loadData = useCallback(async () => {
    // ...
}, [postoId]); // Recria quando postoId muda
```

### Problema: Loop infinito de re-renderizações

**Solução:** Use `useCallback` e `useMemo` corretamente

```typescript
// ❌ PROBLEMA - Cria nova função a cada render
const loadData = async () => {
    // ...
};

useEffect(() => {
    loadData();
}, [loadData]); // loadData muda a cada render = loop

// ✅ SOLUÇÃO
const loadData = useCallback(async () => {
    // ...
}, [postoId]); // Só recria quando postoId muda
```

### Problema: Estado não atualiza imediatamente

**Solução:** Lembre que `setState` é assíncrono

```typescript
// ❌ PROBLEMA
setClientes(newClientes);
console.log(clientes); // Ainda tem valor antigo!

// ✅ SOLUÇÃO 1 - Use o valor novo diretamente
const newClientes = [...clientes, novoCliente];
setClientes(newClientes);
console.log(newClientes); // Valor correto

// ✅ SOLUÇÃO 2 - Use useEffect para reagir a mudanças
useEffect(() => {
    console.log('Clientes atualizados:', clientes);
}, [clientes]);
```

### Problema: Dados não carregam ao montar componente

**Solução:** Verifique as dependências do `useEffect`

```typescript
// ❌ PROBLEMA - Não executa se postoId for undefined inicialmente
useEffect(() => {
    if (!postoId) return; // Retorna mas não tenta de novo
    loadData();
}, []); // Array vazio = só executa uma vez

// ✅ SOLUÇÃO - Reage a mudanças no postoId
useEffect(() => {
    if (!postoId) return;
    loadData();
}, [postoId, loadData]); // Executa quando postoId estiver disponível
```

---

## 📚 Referências

### Documentação Oficial
- [React Hooks](https://react.dev/reference/react)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [React Hook Form](https://react-hook-form.com/)

### Documentação do Projeto
- `.cursorrules` - Regras do projeto
- `PRD-013` - Dashboard Estratégico
- `PRD-016` - Configurações
- `PRD-015` - Gestão de Clientes
- `RELATORIO-ISSUE-13.md` - Relatório Issue #13
- `RELATORIO-ISSUE-16.md` - Relatório Issue #16
- `RELATORIO-ISSUE-15.md` - Relatório Issue #15

### Padrões Estabelecidos
- Sprint 2 - Componentes Críticos
- Arquitetura modular
- TypeScript estrito (zero `any`)
- JSDoc 100%

---

## 📊 Resumo

### Hooks Criados

| Módulo | Hooks | Finalidade |
|--------|-------|------------|
| **Dashboard AI** | 6 | Métricas, insights, alertas, promoções |
| **Configurações** | 4 | Dados, formulários, parâmetros, reset |
| **Clientes** | 4 | CRUD, notas, pagamentos |
| **TOTAL** | **14** | Lógica de negócio modularizada |

### Benefícios

✅ **Separação de Responsabilidades** - Lógica isolada da UI  
✅ **Reusabilidade** - Hooks podem ser usados em múltiplos componentes  
✅ **Type Safety** - TypeScript 100% estrito  
✅ **Testabilidade** - Hooks isolados e fáceis de testar  
✅ **Manutenibilidade** - Código organizado e documentado  
✅ **Performance** - `useCallback` e `useMemo` otimizam re-renderizações  

---

**Criado em:** 11/01/2026  
**Versão:** 1.0  
**Autor:** Sistema de Refatoração  
**Sprint:** Sprint 2 - Componentes Críticos
