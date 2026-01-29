import type { LucideIcon } from 'lucide-react-native';

/**
 * Interface que define a estrutura de uma forma de pagamento na UI.
 */
export interface FormaPagamento {
    /** Identificador único da forma de pagamento (ex: 'debito', 'pix') */
    id: string;
    /** Rótulo exibido para o usuário */
    label: string;
    /** Ícone da biblioteca Lucide a ser exibido */
    icon: LucideIcon;
    /** Cor principal do ícone */
    color: string;
    /** Cor de fundo do container do ícone */
    bgColor: string;
}

/**
 * Interface que representa um item de nota/vale adicionado na lista temporária.
 */
export interface NotaItem {
    /** ID do cliente associado à nota */
    cliente_id: number;
    /** Nome do cliente para exibição */
    cliente_nome: string;
    /** Valor formatado como string para exibição */
    valor: string;
    /** Valor numérico para cálculos */
    valor_number: number;
}

/**
 * Interface que armazena os valores dos inputs do formulário de registro de turno.
 * Todos os campos são strings para facilitar o manuseio em inputs controlados.
 */
export interface RegistroTurno {
    /** Valor do encerrante (bomba) */
    valorEncerrante: string;
    /** Total em cartão de débito */
    valorCartaoDebito: string;
    /** Total em cartão de crédito */
    valorCartaoCredito: string;
    /** Total em PIX */
    valorPix: string;
    /** Total em dinheiro */
    valorDinheiro: string;
    /** Total em moedas */
    valorMoedas: string;
    /** Total em Baratão */
    valorBaratao: string;
    /** Observações gerais do fechamento */
    observacoes: string;
}
