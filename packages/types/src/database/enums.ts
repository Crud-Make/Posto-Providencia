/**
 * Enums compartilhados do banco de dados
 * @module @posto/types/database/enums
 */

/**
 * Status possíveis de um Fechamento
 */
export enum StatusFechamento {
    ABERTO = 'ABERTO',
    FECHADO = 'FECHADO',
    REVISAO = 'REVISAO'
}

/**
 * Tipos de pagamento aceitos
 */
export enum FormaPagamento {
    DINHEIRO = 'dinheiro',
    PIX = 'pix',
    CARTAO_CREDITO = 'cartao_credito',
    CARTAO_DEBITO = 'cartao_debito',
    NOTA_VALE = 'nota_vale'
}

/**
 * Tipos de escala de trabalho
 */
export enum TipoEscala {
    TRABALHO = 'TRABALHO',
    FOLGA = 'FOLGA'
}

/**
 * Papéis de usuários no sistema
 */
export enum UserRole {
    ADMIN = 'ADMIN',
    PROPRIETARIO = 'PROPRIETARIO',
    GERENTE = 'GERENTE',
    FRENTISTA = 'FRENTISTA'
}
