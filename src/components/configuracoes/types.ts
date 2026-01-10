// [10/01 17:46] Criado durante refatoração Issue #16

import { ProductConfig, NozzleConfig, PaymentMethodConfig } from '../../types';

/**
 * Tipo de pagamento suportado pelo sistema.
 */
export type PaymentType = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros';

/**
 * Interface para configuração de produto (combustível).
 * Reutiliza a interface ProductConfig do sistema.
 */
export interface Produto extends ProductConfig { }

/**
 * Interface para configuração de bico.
 * Reutiliza a interface NozzleConfig do sistema.
 */
export interface Bico extends NozzleConfig { }

/**
 * Interface para configuração de forma de pagamento.
 * Reutiliza a interface PaymentMethodConfig do sistema.
 */
export interface FormaPagamento extends PaymentMethodConfig { }

/**
 * Dados carregados para a tela de configurações.
 */
export interface ConfiguracoesData {
    /** Lista de produtos configurados */
    products: Produto[];
    /** Lista de bicos configurados */
    nozzles: Bico[];
    /** Lista de formas de pagamento configuradas */
    paymentMethods: FormaPagamento[];
}

/**
 * Parâmetros de configurações financeiras e de estoque.
 */
export interface ParametrosConfig {
    /** Tolerância para divergência no fechamento (R$) */
    tolerance: string;
    /** Dias para considerar estoque crítico */
    diasEstoqueCritico: string;
    /** Dias para considerar estoque baixo */
    diasEstoqueBaixo: string;
}

/**
 * Estado do formulário de forma de pagamento.
 */
export interface PaymentFormState {
    /** Nome da forma de pagamento */
    name: string;
    /** Tipo da forma de pagamento */
    type: PaymentType;
    /** Taxa aplicada (%) */
    tax: number;
    /** Se está ativa ou não */
    active: boolean;
}

/**
 * Props para o componente GestaoProdutos.
 */
export interface GestaoProdutosProps {
    /** Lista de produtos */
    products: Produto[];
    /** Estado de carregamento */
    loading: boolean;
}

/**
 * Props para o componente GestaoBicos.
 */
export interface GestaoBicosProps {
    /** Lista de bicos */
    nozzles: Bico[];
    /** Estado de carregamento */
    loading: boolean;
}

/**
 * Props para o componente GestaoFormasPagamento.
 */
export interface GestaoFormasPagamentoProps {
    /** Lista de formas de pagamento */
    paymentMethods: FormaPagamento[];
    /** Estado de carregamento */
    loading: boolean;
    /** Callback para abrir modal de criação */
    onAdd: () => void;
    /** Callback para editar uma forma de pagamento */
    onEdit: (method: FormaPagamento) => void;
    /** Callback para alternar status */
    onToggleStatus: (id: string, currentStatus: boolean) => void;
    /** Props do modal (estado e handlers) */
    modal: ModalFormaPagamentoProps;
}

/**
 * Props para o componente ParametrosFechamento.
 */
export interface ParametrosFechamentoProps {
    /** Valor da tolerância */
    tolerance: string;
    /** Estado de salvamento */
    saving: boolean;
    /** Se houve modificação */
    modified: boolean;
    /** Callback de alteração */
    onChange: (value: string) => void;
    /** Callback de salvamento */
    onSave: () => void;
}

/**
 * Props para o componente ParametrosEstoque.
 */
export interface ParametrosEstoqueProps {
    /** Dias para estoque crítico */
    diasCritico: string;
    /** Dias para estoque baixo */
    diasBaixo: string;
    /** Estado de salvamento */
    saving: boolean;
    /** Se houve modificação */
    modified: boolean;
    /** Callback de alteração de dias críticos */
    onChangeCritico: (value: string) => void;
    /** Callback de alteração de dias baixos */
    onChangeBaixo: (value: string) => void;
    /** Callback de salvamento */
    onSave: () => void;
}

/**
 * Props para o Modal de Reset do Sistema.
 */
export interface ModalResetSistemaProps {
    /** Se o modal está aberto */
    isOpen: boolean;
    /** Se está executando o reset */
    isResetting: boolean;
    /** Callback para fechar o modal */
    onClose: () => void;
    /** Callback para confirmar o reset */
    onConfirm: (text: string) => void;
}

/**
 * Props para o Modal de Edição de Forma de Pagamento.
 */
export interface ModalFormaPagamentoProps {
    /** Se o modal está aberto */
    isOpen: boolean;
    /** Forma de pagamento sendo editada (null se for criação) */
    editingPayment: FormaPagamento | null;
    /** Dados do formulário */
    formData: PaymentFormState;
    /** Callback para fechar o modal */
    onClose: () => void;
    /** Callback para salvar */
    onSave: () => void;
    /** Callback para alterar dados do formulário */
    onChange: (field: keyof PaymentFormState, value: string | number | boolean) => void;
}
