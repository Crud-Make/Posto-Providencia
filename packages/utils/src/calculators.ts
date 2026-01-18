/**
 * Calculadores financeiros compartilhados
 * @module @posto/utils/calculators
 */

import type { FechamentoFrentista } from '@posto/types';

/**
 * Calcula total de pagamentos de um fechamento
 * @param pagamentos - Objeto com valores de cada forma de pagamento
 * @returns Total somado
 */
export function calcularTotalPagamentos(
    pagamentos: Pick<FechamentoFrentista,
        'valor_dinheiro' | 'valor_pix' | 'valor_cartao_credito' | 'valor_cartao_debito' | 'valor_nota' | 'valor_moedas'>
): number {
    return (
        (pagamentos.valor_dinheiro ?? 0) +
        (pagamentos.valor_pix ?? 0) +
        (pagamentos.valor_cartao_credito ?? 0) +
        (pagamentos.valor_cartao_debito ?? 0) +
        (pagamentos.valor_nota ?? 0) +
        (pagamentos.valor_moedas ?? 0)
    );
}

/**
 * Calcula diferença de caixa (sobra/falta)
 * @param valorEsperado - Valor esperado (encerrante)
 * @param valorInformado - Valor informado (pagamentos)
 * @returns Diferença (positivo = falta, negativo = sobra)
 */
export function calcularDiferencaCaixa(
    valorEsperado: number,
    valorInformado: number
): number {
    return valorEsperado - valorInformado;
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 */
export function formatDateDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formata data para banco de dados (YYYY-MM-DD)
 */
export function formatDateForDB(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
