import { Despesa } from '../despesas/types';

export interface ShiftData {
    turnoName: string;
    turnoId: number;
    status: 'Aberto' | 'Fechado' | 'Pendente';
    vendas: number;
    litros: number;
    lucro: number;
    /** `null` = não apurado: sem encerrante completo no dia (não é zero). */
    diferenca: number | null;
    frentistas: string[];
}

export interface DailyTotals {
    vendas: number;
    litros: number;
    lucro: number;
    despesas: number;
    lucroLiquido: number;
    /** `null` = não apurado: sem encerrante completo no dia (não é zero). */
    diferenca: number | null;
    projetadoMensal: number;
}

export type ExpenseData = Despesa;
