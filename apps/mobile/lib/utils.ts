// [18/01 17:45] Adicionado JSDoc completo para todas as funções utilitárias
/**
 * Formata um valor numérico para o formato de moeda brasileira (BRL).
 * @param {number} value - O valor numérico a ser formatado.
 * @returns {string} O valor formatado como moeda (ex: R$ 1.234,56).
 */
export const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

/**
 * Converte uma string de valor formatado (com vírgula) para número float.
 * Remove caracteres não numéricos exceto a vírgula decimal.
 * @param {string} value - A string do valor (ex: "1.234,56").
 * @returns {number} O valor numérico parseado. Retorna 0 se inválido.
 */
export const parseValue = (value: string): number => {
    if (!value) return 0;
    const cleanStr = value.replace(/[^\d,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleanStr);
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formata uma string de input numérico (apenas dígitos) para formato monetário BRL.
 * Usado em campos de input onde o usuário digita apenas números.
 * Divide o valor por 100 para considerar os centavos.
 * @param {string} value - A string contendo apenas dígitos.
 * @returns {string} O valor formatado com separadores de milhar e decimal.
 */
export const formatCurrencyInput = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, '');
    if (onlyNumbers === '') return '';
    const amount = parseInt(onlyNumbers) / 100;
    return amount.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/AAAA).
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data formatada como string.
 */
export const formatDateDisplay = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

/**
 * Formata uma data para o formato aceito pelo banco de dados (AAAA-MM-DD).
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data formatada no padrão ISO 8601 (apenas data).
 */
export const formatDateForDB = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
