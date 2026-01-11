import { Cliente, NotaFrentista, Frentista } from '../../types/database/index';

// Dados e Estados

/**
 * Interface estendida de NotaFrentista incluindo relacionamentos.
 */
export interface NotaFrentistaComRelacoes extends NotaFrentista {
    cliente?: Partial<Cliente>;
    frentista?: Partial<Frentista>;
}

/**
 * Interface estendida de Cliente incluindo saldo devedor e notas.
 */
export interface ClienteComSaldo extends Cliente {
    /** Saldo devedor calculado do cliente */
    saldo_devedor: number;
    /** Lista opcional de notas de fiado do cliente */
    notas?: NotaFrentistaComRelacoes[];
}

/**
 * Dados para o resumo financeiro dos clientes.
 */
export interface ClientesResumoData {
    /** Total de clientes cadastrados */
    totalClientes: number;
    /** Quantidade de clientes com débito pendente */
    totalDevedores: number;
    /** Valor total a receber de todos os clientes */
    valorTotalPendente: number;
}

/**
 * Dados do formulário de cadastro/edição de cliente.
 */
export interface ClienteFormData {
    nome: string;
    documento: string;
    telefone: string;
    email: string;
    limite_credito: string;
    endereco: string;
}

/**
 * Dados do formulário de nova nota de fiado.
 */
export interface NotaFormData {
    valor: string;
    descricao: string;
    data: string;
    frentista_id: string;
    jaPaga: boolean;
    dataPagamento: string;
    formaPagamento: string;
}

/**
 * Dados do formulário de pagamento de nota.
 */
export interface PagamentoFormData {
    notaId: number;
    data: string;
    formaPagamento: string;
    observacoes: string;
}

// Props dos Componentes

/**
 * Props para o componente de resumo de clientes.
 */
export interface ClientesResumoProps {
    resumo: ClientesResumoData;
    loading: boolean;
}

/**
 * Props para o componente de lista de clientes.
 */
export interface ClientesListaProps {
    clientes: ClienteComSaldo[];
    loading: boolean;
    searchTerm: string;
    selectedClienteId: number | null;
    onSearchChange: (term: string) => void;
    onClienteClick: (cliente: ClienteComSaldo) => void;
}

/**
 * Props para o componente de detalhes do cliente.
 */
export interface ClienteDetalhesProps {
    cliente: ClienteComSaldo | null;
    notas: NotaFrentistaComRelacoes[];
    loadingNotas: boolean;
    onNovaNota: () => void;
    onEditarCliente: () => void;
    onBloquear: () => void;
    onApagar: () => void;
    onPagamento: (notaId: number) => void;
}

/**
 * Props para o componente de lista de notas.
 */
export interface NotasListaProps {
    notas: NotaFrentistaComRelacoes[];
    loading: boolean;
    onPagamento: (notaId: number) => void;
}

/**
 * Props para o modal de cadastro/edição de cliente.
 */
export interface ModalClienteProps {
    isOpen: boolean;
    editingId: number | null;
    formData: ClienteFormData;
    onClose: () => void;
    onSave: () => void;
    onChange: (field: keyof ClienteFormData, value: string) => void;
}

/**
 * Props para o modal de nova nota de fiado.
 */
export interface ModalNotaProps {
    isOpen: boolean;
    formData: NotaFormData;
    frentistas: Frentista[];
    onClose: () => void;
    onSave: () => void;
    onChange: (field: keyof NotaFormData, value: string | boolean) => void;
    saving: boolean;
}

/**
 * Props para o modal de pagamento de nota.
 */
export interface ModalPagamentoProps {
    isOpen: boolean;
    formData: PagamentoFormData;
    onClose: () => void;
    onConfirm: () => void;
    onChange: (field: keyof PagamentoFormData, value: string) => void;
}
