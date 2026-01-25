/**
 * Utilitários de manipulação e formatação de datas
 * @module @posto/utils/dates
 */

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/AAAA).
 * @param date - O objeto Date a ser formatado.
 * @returns A data formatada como string.
 */
export function formatDateDisplay(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Formata uma data para o formato aceito pelo banco de dados (AAAA-MM-DD).
 * @param date - O objeto Date a ser formatado.
 * @returns A data formatada no padrão ISO 8601 (apenas data).
 */
export function formatDateForDB(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
