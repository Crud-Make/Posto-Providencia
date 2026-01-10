/**
 * Tipos relacionados a Configurações.
 */

/**
 * Configuração de produto (combustível).
 */
export interface ProductConfig {
    id: string;
    name: string;
    type: 'Combustível' | 'Biocombustível' | 'Diesel';
    price: number;
}

/**
 * Configuração de bico no sistema.
 */
export interface NozzleConfig {
    id: string;
    number: string;
    productName: string;
    tankSource: string;
}

/**
 * Configuração das taxas e tipos de pagamento.
 */
export interface PaymentMethodConfig {
    id: string;
    name: string;
    type: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros';
    tax: number;
    active: boolean;
}
