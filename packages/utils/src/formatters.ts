/**
 * Utilitários de formatação de valores monetários
 * @module @posto/utils/formatters
 */

/**
 * Converte string brasileira para número
 * @param value - String no formato "1.234,56"
 * @returns Número parseado (1234.56)
 * @example
 * parseValue("1.234,56") // 1234.56
 * parseValue("R$ 100,00") // 100.00
 */
export function parseValue(value: string): number {
    if (!value || value.trim() === '') return 0;

    // Remove R$, espaços e outros caracteres
    const cleaned = value.replace(/[R$\s]/g, '');

    // Remove pontos de milhar e substitui vírgula por ponto
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');

    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata número para moeda BRL
 * @param valor - Número a ser formatado
 * @returns String no formato "R$ 1.234,56"
 * @example
 * formatCurrency(1234.56) // "R$ 1.234,56"
 */
export function formatCurrency(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

/**
 * Formata número para padrão BR com decimais customizados
 * @param num - Número a ser formatado
 * @param decimais - Quantidade de casas decimais (padrão: 2)
 * @returns String no formato "1.234,567"
 * @example
 * formatBR(1234.567, 3) // "1.234,567"
 */
export function formatBR(num: number, decimais: number = 2): string {
    return num.toLocaleString('pt-BR', {
        minimumFractionDigits: decimais,
        maximumFractionDigits: decimais
    });
}

/**
 * Formata input de moeda enquanto usuário digita
 * @param value - String sendo digitada
 * @returns String formatada progressivamente
 * @example
 * formatCurrencyInput("1234") // "12,34"
 */
export function formatCurrencyInput(value: string): string {
    if (!value) return '';

    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';

    // Converte para número e divide por 100 para ter centavos
    const amount = parseInt(numbers, 10) / 100;

    // Formata
    return formatBR(amount, 2);
}
