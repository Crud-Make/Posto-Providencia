/**
 * Tipos relacionados a Fechamento de Caixa.
 */

/**
 * Frentista vinculado a um fechamento.
 */
export interface ClosingAttendant {
    id: string;
    name: string;
    avatar: string;
    shift: string;
    expectedValue: number;
    declared: {
        card: number;
        note: number;
        pix: number;
        cash: number;
    };
    observation?: string;
    hasHistory?: boolean;
}
