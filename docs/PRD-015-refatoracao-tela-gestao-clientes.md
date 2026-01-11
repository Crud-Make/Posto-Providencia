# PRD-015: Refatoração TelaGestaoClientes.tsx

**Data:** 11/01/2026  
**Issue:** #15  
**Sprint:** Sprint 2 - Componentes Críticos  
**Prioridade:** 🔴 ALTA  
**Estimativa:** 6-8 horas

---

## 📋 CONTEXTO

### Situação Atual
O componente `TelaGestaoClientes.tsx` possui **957 linhas** e **55 KB**, sendo um dos maiores componentes do sistema. Ele gerencia:
- Listagem e busca de clientes
- CRUD de clientes
- Gestão de notas de fiado
- Pagamentos e baixas
- Bloqueio/desbloqueio de clientes
- Integração com frentistas

### Problemas Identificados
1. ✗ **Arquivo monolítico** - 957 linhas em um único arquivo
2. ✗ **Múltiplos `any`** - Tipos não estritos (linhas 49, 53, 54, 76)
3. ✗ **Lógica misturada** - Business logic + UI no mesmo arquivo
4. ✗ **Difícil manutenção** - Muitas responsabilidades
5. ✗ **Sem JSDoc** - Falta documentação
6. ✗ **Difícil testar** - Lógica acoplada

---

## 🎯 OBJETIVO

Refatorar `TelaGestaoClientes.tsx` em uma arquitetura modular, seguindo o padrão estabelecido nas Issues #13 e #16.

### Metas
- ✅ Reduzir arquivo principal para **< 200 linhas**
- ✅ Eliminar **100% dos `any`**
- ✅ Criar **hooks customizados** para lógica de negócio
- ✅ Criar **componentes UI** reutilizáveis
- ✅ Adicionar **JSDoc 100%**
- ✅ Manter **zero breaking changes**

---

## 🏗️ ARQUITETURA PROPOSTA

### Estrutura de Diretórios
```
src/components/clientes/
├── index.ts                        # Barrel export
├── types.ts                        # Interfaces TypeScript
├── TelaGestaoClientes.tsx          # Orquestrador (< 200 linhas)
├── hooks/
│   ├── index.ts                    # Barrel export
│   ├── useClientesData.ts          # Carregamento de dados
│   ├── useClienteForm.ts           # Formulário de cliente
│   ├── useNotaFrentista.ts         # Gestão de notas
│   └── usePagamento.ts             # Gestão de pagamentos
└── components/
    ├── index.ts                    # Barrel export
    ├── ClientesResumo.tsx          # Cards de resumo
    ├── ClientesLista.tsx           # Lista de clientes
    ├── ClienteDetalhes.tsx         # Detalhes do cliente
    ├── NotasLista.tsx              # Lista de notas
    ├── ModalCliente.tsx            # Modal de criação/edição
    ├── ModalNovaNota.tsx           # Modal de nova nota
    └── ModalPagamento.tsx          # Modal de pagamento
```

**Total Estimado:** 15 arquivos

---

## 📦 MÓDULOS DETALHADOS

### 1. types.ts
**Responsabilidade:** Definições TypeScript

**Interfaces a criar:**
```typescript
// Dados e Estados
export interface ClienteComSaldo extends Cliente {
    saldo_devedor: number;
    notas?: NotaFrentista[];
}

export interface ClientesResumo {
    totalClientes: number;
    totalDevedores: number;
    valorTotalPendente: number;
}

export interface ClienteFormData {
    nome: string;
    documento: string;
    telefone: string;
    email: string;
    limite_credito: string;
    endereco: string;
}

export interface NotaFormData {
    valor: string;
    descricao: string;
    data: string;
    frentista_id: string;
    jaPaga: boolean;
    dataPagamento: string;
    formaPagamento: string;
}

export interface PagamentoFormData {
    notaId: number;
    data: string;
    formaPagamento: string;
    observacoes: string;
}

// Props dos Componentes
export interface ClientesResumoProps {
    resumo: ClientesResumo;
    loading: boolean;
}

export interface ClientesListaProps {
    clientes: ClienteComSaldo[];
    loading: boolean;
    searchTerm: string;
    selectedClienteId: number | null;
    onSearchChange: (term: string) => void;
    onClienteClick: (cliente: ClienteComSaldo) => void;
}

export interface ClienteDetalhesProps {
    cliente: ClienteComSaldo | null;
    notas: NotaFrentista[];
    loadingNotas: boolean;
    onNovaNota: () => void;
    onEditarCliente: () => void;
    onBloquear: () => void;
    onApagar: () => void;
    onPagamento: (notaId: number) => void;
}

export interface NotasListaProps {
    notas: NotaFrentista[];
    loading: boolean;
    onPagamento: (notaId: number) => void;
}

export interface ModalClienteProps {
    isOpen: boolean;
    editingId: number | null;
    formData: ClienteFormData;
    onClose: () => void;
    onSave: () => void;
    onChange: (field: keyof ClienteFormData, value: string) => void;
}

export interface ModalNotaProps {
    isOpen: boolean;
    formData: NotaFormData;
    frentistas: any[]; // TODO: Tipar corretamente
    onClose: () => void;
    onSave: () => void;
    onChange: (field: keyof NotaFormData, value: string | boolean) => void;
    saving: boolean;
}

export interface ModalPagamentoProps {
    isOpen: boolean;
    formData: PagamentoFormData;
    onClose: () => void;
    onConfirm: () => void;
    onChange: (field: keyof PagamentoFormData, value: string) => void;
}
```

---

### 2. Hooks

#### useClientesData.ts
**Responsabilidade:** Carregamento e gestão de clientes

```typescript
/**
 * Hook para gerenciar dados de clientes.
 * Carrega clientes com saldo, calcula resumo e gerencia estado de loading.
 */
export function useClientesData(postoId: string | undefined) {
    const [clientes, setClientes] = useState<ClienteComSaldo[]>([]);
    const [loading, setLoading] = useState(true);
    const [resumo, setResumo] = useState<ClientesResumo>({
        totalClientes: 0,
        totalDevedores: 0,
        valorTotalPendente: 0
    });

    const loadClientes = async () => { /* ... */ };
    const refreshClientes = () => loadClientes();

    return {
        clientes,
        setClientes,
        loading,
        resumo,
        refreshClientes
    };
}
```

#### useClienteForm.ts
**Responsabilidade:** Formulário de cliente (criar/editar)

```typescript
/**
 * Hook para gerenciar formulário de cliente.
 * Controla modal, validação e salvamento.
 */
export function useClienteForm(
    postoId: string | undefined,
    onSuccess: () => void
) {
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<ClienteFormData>({ /* ... */ });

    const openModal = (cliente?: ClienteComSaldo) => { /* ... */ };
    const closeModal = () => { /* ... */ };
    const handleChange = (field: keyof ClienteFormData, value: string) => { /* ... */ };
    const handleSave = async () => { /* ... */ };

    return {
        isOpen,
        editingId,
        formData,
        openModal,
        closeModal,
        handleChange,
        handleSave
    };
}
```

#### useNotaFrentista.ts
**Responsabilidade:** Gestão de notas de fiado

```typescript
/**
 * Hook para gerenciar notas de frentista.
 * Controla criação, listagem e carregamento de notas.
 */
export function useNotaFrentista(
    clienteId: number | null,
    postoId: string | undefined
) {
    const [notas, setNotas] = useState<NotaFrentista[]>([]);
    const [loadingNotas, setLoadingNotas] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<NotaFormData>({ /* ... */ });
    const [frentistas, setFrentistas] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const loadNotas = async () => { /* ... */ };
    const loadFrentistas = async () => { /* ... */ };
    const openModal = () => { /* ... */ };
    const closeModal = () => { /* ... */ };
    const handleChange = (field: keyof NotaFormData, value: string | boolean) => { /* ... */ };
    const handleSave = async () => { /* ... */ };

    return {
        notas,
        loadingNotas,
        isModalOpen,
        formData,
        frentistas,
        saving,
        openModal,
        closeModal,
        handleChange,
        handleSave,
        refreshNotas: loadNotas
    };
}
```

#### usePagamento.ts
**Responsabilidade:** Gestão de pagamentos

```typescript
/**
 * Hook para gerenciar pagamentos de notas.
 * Controla modal e registro de pagamentos.
 */
export function usePagamento(onSuccess: () => void) {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState<PagamentoFormData>({ /* ... */ });

    const openModal = (notaId: number) => { /* ... */ };
    const closeModal = () => { /* ... */ };
    const handleChange = (field: keyof PagamentoFormData, value: string) => { /* ... */ };
    const handleConfirm = async () => { /* ... */ };

    return {
        isOpen,
        formData,
        openModal,
        closeModal,
        handleChange,
        handleConfirm
    };
}
```

---

### 3. Componentes UI

#### ClientesResumo.tsx
**Responsabilidade:** Cards de resumo (Total, Devedores, A Receber)

```typescript
/**
 * Componente de resumo de clientes.
 * Exibe cards com total de clientes, devedores e valor a receber.
 */
export const ClientesResumo: React.FC<ClientesResumoProps> = ({
    resumo,
    loading
}) => {
    // Renderiza 3 cards com ícones e valores
};
```

#### ClientesLista.tsx
**Responsabilidade:** Lista de clientes com busca

```typescript
/**
 * Componente de listagem de clientes.
 * Exibe lista com busca, saldo devedor e indicador de bloqueio.
 */
export const ClientesLista: React.FC<ClientesListaProps> = ({
    clientes,
    loading,
    searchTerm,
    selectedClienteId,
    onSearchChange,
    onClienteClick
}) => {
    // Renderiza input de busca e lista de clientes
};
```

#### ClienteDetalhes.tsx
**Responsabilidade:** Detalhes do cliente selecionado

```typescript
/**
 * Componente de detalhes do cliente.
 * Exibe informações, saldo e ações (nova nota, editar, bloquear, apagar).
 */
export const ClienteDetalhes: React.FC<ClienteDetalhesProps> = ({
    cliente,
    notas,
    loadingNotas,
    onNovaNota,
    onEditarCliente,
    onBloquear,
    onApagar,
    onPagamento
}) => {
    // Renderiza header do cliente + NotasLista
};
```

#### NotasLista.tsx
**Responsabilidade:** Lista de notas do cliente

```typescript
/**
 * Componente de listagem de notas.
 * Exibe tabela de notas com status e ações.
 */
export const NotasLista: React.FC<NotasListaProps> = ({
    notas,
    loading,
    onPagamento
}) => {
    // Renderiza tabela de notas
};
```

#### ModalCliente.tsx
**Responsabilidade:** Modal de criação/edição de cliente

```typescript
/**
 * Modal para criar ou editar cliente.
 * Formulário com validação de campos obrigatórios.
 */
export const ModalCliente: React.FC<ModalClienteProps> = ({
    isOpen,
    editingId,
    formData,
    onClose,
    onSave,
    onChange
}) => {
    // Renderiza modal com formulário
};
```

#### ModalNovaNota.tsx
**Responsabilidade:** Modal de criação de nota

```typescript
/**
 * Modal para criar nova nota de fiado.
 * Permite marcar como já paga e selecionar frentista.
 */
export const ModalNovaNota: React.FC<ModalNotaProps> = ({
    isOpen,
    formData,
    frentistas,
    onClose,
    onSave,
    onChange,
    saving
}) => {
    // Renderiza modal com formulário de nota
};
```

#### ModalPagamento.tsx
**Responsabilidade:** Modal de registro de pagamento

```typescript
/**
 * Modal para registrar pagamento de nota.
 * Permite escolher data, forma de pagamento e observações.
 */
export const ModalPagamento: React.FC<ModalPagamentoProps> = ({
    isOpen,
    formData,
    onClose,
    onConfirm,
    onChange
}) => {
    // Renderiza modal de confirmação de pagamento
};
```

---

### 4. Componente Principal

#### TelaGestaoClientes.tsx
**Responsabilidade:** Orquestrador (< 200 linhas)

```typescript
/**
 * Tela de Gestão de Clientes e Fiado.
 * Permite gerenciar clientes, notas de fiado e pagamentos.
 * 
 * @remarks
 * Este componente foi refatorado da versão monolítica (957 linhas)
 * para uma arquitetura modular seguindo o padrão da Issue #13 e #16.
 */
const TelaGestaoClientes: React.FC = () => {
    const { postoAtivo } = usePosto();
    
    // Hooks de dados
    const { clientes, loading, resumo, refreshClientes } = useClientesData(postoAtivo?.id);
    
    // Hooks de formulários
    const clienteForm = useClienteForm(postoAtivo?.id, refreshClientes);
    const notaForm = useNotaFrentista(selectedCliente?.id, postoAtivo?.id);
    const pagamentoForm = usePagamento(() => {
        notaForm.refreshNotas();
        refreshClientes();
    });
    
    // Estado local
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<ClienteComSaldo | null>(null);
    
    // Handlers
    const handleClienteClick = async (cliente: ClienteComSaldo) => { /* ... */ };
    const handleBloquear = async () => { /* ... */ };
    const handleApagar = async () => { /* ... */ };
    
    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Header com botão Novo Cliente */}
            
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
```

---

## ✅ CRITÉRIOS DE ACEITE

### Funcionalidade
- [ ] Todas as funcionalidades existentes preservadas
- [ ] CRUD de clientes funcionando
- [ ] Gestão de notas funcionando
- [ ] Pagamentos funcionando
- [ ] Bloqueio/desbloqueio funcionando
- [ ] Busca de clientes funcionando

### Qualidade de Código
- [ ] Arquivo principal < 200 linhas
- [ ] Zero `any` - TypeScript 100% estrito
- [ ] JSDoc 100% completo
- [ ] Rastreio em todos os arquivos
- [ ] Build passa sem erros
- [ ] Zero breaking changes

### Arquitetura
- [ ] 15 arquivos criados
- [ ] 4 hooks customizados
- [ ] 7 componentes UI
- [ ] 1 arquivo de types
- [ ] Barrel exports configurados

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Preparação
- [ ] Criar estrutura de diretórios
- [ ] Criar `types.ts` com todas as interfaces
- [ ] Criar barrel exports (`index.ts`)

### Fase 2: Hooks
- [ ] Implementar `useClientesData.ts`
- [ ] Implementar `useClienteForm.ts`
- [ ] Implementar `useNotaFrentista.ts`
- [ ] Implementar `usePagamento.ts`

### Fase 3: Componentes UI
- [ ] Implementar `ClientesResumo.tsx`
- [ ] Implementar `ClientesLista.tsx`
- [ ] Implementar `ClienteDetalhes.tsx`
- [ ] Implementar `NotasLista.tsx`
- [ ] Implementar `ModalCliente.tsx`
- [ ] Implementar `ModalNovaNota.tsx`
- [ ] Implementar `ModalPagamento.tsx`

### Fase 4: Orquestrador
- [ ] Refatorar `TelaGestaoClientes.tsx`
- [ ] Integrar todos os hooks
- [ ] Integrar todos os componentes

### Fase 5: Qualidade
- [ ] Eliminar todos os `any`
- [ ] Adicionar JSDoc completo
- [ ] Adicionar rastreio de mudanças
- [ ] Validar build

### Fase 6: Finalização
- [ ] Testar funcionalidade completa
- [ ] Commit semântico
- [ ] Push para branch
- [ ] Gerar relatório

---

## 🎯 MÉTRICAS DE SUCESSO

| Métrica | Antes | Meta | Melhoria |
|---------|-------|------|----------|
| Linhas do arquivo principal | 957 | < 200 | > 79% |
| Arquivos | 1 | 15 | +1.400% |
| Hooks customizados | 0 | 4 | Novo |
| Componentes UI | 0 | 7 | Novo |
| Tipos `any` | ~10 | 0 | 100% |
| JSDoc | 0% | 100% | 100% |

---

## 📚 REFERÊNCIAS

- Issue #13: StrategicDashboard.tsx (CONCLUÍDA)
- Issue #16: TelaConfiguracoes.tsx (CONCLUÍDA)
- `.cursorrules` - Regras do projeto
- `SPRINT-2-COMPONENTES-CRITICOS.md`

---

## 🚀 PRÓXIMOS PASSOS

1. Criar Issue #15 no GitHub
2. Implementar conforme checklist
3. Validar build e funcionalidade
4. Gerar relatório final
5. Merge para main

---

**Criado em:** 11/01/2026  
**Por:** Sistema de Refatoração  
**Issue:** #15  
**Sprint:** Sprint 2
