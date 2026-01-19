/**
 * Tipos relacionados ao Financeiro.
 */

/**
 * Parcela individual de um empréstimo.
 */
export interface LoanInstallment {
    id: string;
    emprestimoId: string;
    numeroParcela: number;
    dataVencimento: string;
    valor: number;
    dataPagamento?: string | null;
    status: 'pendente' | 'pago' | 'atrasado';
    jurosMulta?: number;
}

/**
 * Representa um empréstimo ou financiamento.
 */
export interface Loan {
    id: string;
    credor: string;
    valorTotal: number;
    quantidadeParcelas: number;
    valorParcela: number;
    dataEmprestimo: string;
    dataPrimeiroVencimento: string;
    periodicidade: 'mensal' | 'quinzenal' | 'semanal' | 'diario';
    taxaJuros?: number;
    observacoes?: string;
    ativo: boolean;
    parcelas?: LoanInstallment[];
}

/**
 * Registro de dívida ativa do posto.
 */
export interface Divida {
    id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    status: 'pendente' | 'pago';
    posto_id: number;
}

/**
 * Registro de despesa operacional.
 */
export interface Despesa {
    id: string;
    descricao: string;
    categoria: string;
    valor: number;
    data: string;
    status: 'pendente' | 'pago';
    posto_id: number;
    data_pagamento?: string | null;
    observacoes?: string;
}

/**
 * Status de solvência para vencimentos próximos.
 */
export interface SolvencyStatus {
    dividaId: string;
    descricao: string;
    valor: number;
    dataVencimento: string;
    status: 'verde' | 'amarelo' | 'vermelho';
    mensagem: string;
    deficitProjetado?: number;
    diasAteVencimento: number;
    coberturaPorcentagem: number;
}

/**
 * Projeção de solvência e fluxo de caixa.
 */
export interface SolvencyProjection {
    saldoAtual: number;
    mediaDiaria: number;
    proximasParcelas: SolvencyStatus[];
    metaVendas?: {
        totalCompromissos: number;
        litrosNecessarios: number;
        margemPorLitro: number;
        litrosVendidosMes: number;
        lucroGeradoMes: number;
        progressoPorcentagem: number;
        valorRestante: number;
    };
}
