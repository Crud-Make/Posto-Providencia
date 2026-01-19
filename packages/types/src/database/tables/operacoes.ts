/**
 * Tipos de Operações - Entidades relacionadas ao funcionamento diário do posto
 * @module @posto/types/database/tables/operacoes
 */

/**
 * Interface representando um Posto de Combustível
 */
export interface Posto {
    id: number;
    nome: string;
    cnpj: string | null;
    endereco: string | null;
    cidade: string | null;
    estado: string | null;
    telefone: string | null;
    email: string | null;
    ativo: boolean;
}

/**
 * Interface representando um Frentista
 */
export interface Frentista {
    id: number;
    nome: string;
    cpf: string | null;
    telefone: string | null;
    data_admissao: string | null;
    ativo: boolean;
    user_id: string | null;
    turno_id: number | null;
    posto_id: number;
}

/**
 * Interface representando um Turno de trabalho
 */
export interface Turno {
    id: number;
    nome: string;
    horario_inicio: string;
    horario_fim: string;
    posto_id: number;
    ativo: boolean;
}

/**
 * Interface representando um Usuário do sistema
 */
export interface Usuario {
    id: number;
    nome: string;
    email: string;
    role: string;
    posto_id: number | null;
    ativo: boolean;
    created_at: string;
}

/**
 * Interface representando o Fechamento de Caixa
 */
export interface Fechamento {
    id: number;
    data: string;
    usuario_id: number; // Corrigido: number, não string
    turno_id: number;
    status: string;
    total_vendas: number | null;
    total_recebido: number | null;
    diferenca: number | null;
    observacoes: string | null;
    posto_id: number;
}

/**
 * Interface representando os detalhes do Fechamento por Frentista
 */
export interface FechamentoFrentista {
    id: number;
    fechamento_id: number;
    frentista_id: number;
    valor_cartao: number;
    valor_cartao_debito: number;
    valor_cartao_credito: number;
    valor_moedas: number;
    valor_dinheiro: number;
    valor_pix: number;
    valor_nota: number;
    valor_conferido: number;
    diferenca: number;
    observacoes: string | null;
    posto_id: number;
    encerrante: number | null;
    diferenca_calculada: number | null;
}

/**
 * Interface representando um Cliente
 */
export interface Cliente {
    id: number;
    nome: string;
    documento: string | null;
    posto_id: number;
    ativo: boolean;
    bloqueado: boolean;
    telefone: string | null;
    email: string | null;
    limite_credito: number | null;
    saldo_devedor: number | null;
}

/**
 * Interface representando a Escala de trabalho
 */
export interface Escala {
    id: number;
    frentista_id: number;
    data: string;
    tipo: 'FOLGA' | 'TRABALHO';
    turno_id: number | null;
    observacao: string | null;
    posto_id: number;
}

/**
 * Interface representando um Produto
 */
export interface Produto {
    id: number;
    nome: string;
    preco_venda: number;
    estoque_atual: number;
    categoria: string;
    ativo: boolean;
    posto_id: number;
}

/**
 * Interface representando uma Venda de Produto
 */
export interface VendaProduto {
    id: number;
    frentista_id: number;
    produto_id: number;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    data: string;
    fechamento_frentista_id: number | null;
    posto_id: number;
}

/**
 * Interface representando uma Nota de Frentista (Nota a Prazo)
 */
export interface NotaFrentista {
    id: number;
    cliente_id: number;
    frentista_id: number;
    fechamento_frentista_id: number | null;
    valor: number;
    descricao: string | null;
    data: string;
    data_pagamento: string | null;
    status: 'pendente' | 'pago' | 'cancelado';
    forma_pagamento: string | null;
    observacoes: string | null;
    posto_id: number;
    created_at: string;
    updated_at: string;
}
