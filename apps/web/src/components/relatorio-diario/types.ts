import { Despesa } from '../despesas/types';

export interface ShiftData {
    turnoName: string;
    turnoId: number;
    status: 'Aberto' | 'Fechado' | 'Pendente';
    vendas: number;
    litros: number;
    lucro: number;
    diferenca: number;
    frentistas: string[];
}

export interface DailyTotals {
    vendas: number;
    litros: number;
    lucro: number;
    despesas: number;
    lucroLiquido: number;
    diferenca: number;
    projetadoMensal: number;
}

export type ExpenseData = Despesa;
