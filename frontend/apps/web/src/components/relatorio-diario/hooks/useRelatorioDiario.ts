/**
 * Hook do Relatório Diário.
 *
 * @remarks
 * Carrega os insumos do dia — fechamentos, leituras, despesas e compras do mês — e consolida os
 * totais. A fonte é escolhida aqui: a API Laravel com `VITE_API_RELATORIO` (#103,
 * `fonte-da-api.ts`), o Supabase sem (`fonte-supabase.ts`). As contas são as mesmas nas duas
 * (`montar-relatorio.ts`), e nenhuma mudou com a troca.
 */
import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import { usePeriodo } from '../../../contexts/usePeriodo';
import { descreverErroDaApi } from '../../../services/api/base';
import { relatorioDiarioPelaApi } from '../../../services/api/relatorio-diario.api';
import { ShiftData, DailyTotals, ExpenseData } from '../types';
import type { InsumosDoRelatorio } from './insumos';
import { insumosDaApi } from './fonte-da-api';
import { insumosDoSupabase } from './fonte-supabase';
import { montarRelatorio } from './montar-relatorio';

/** Mantido aqui para quem já importava do hook (o teste do preço do dia). */
export { vendaLucroDaLeitura } from './montar-relatorio';

/**
 * Os insumos do dia pela fonte ligada. Falha da API vira `throw` com a mensagem do erro — o mesmo
 * destino da falha do Supabase (o `catch` do hook) —, e nunca cai para o Supabase: com o login
 * pela API não há sessão dele, e cair lá mostraria um dia vazio como se fosse verdade.
 */
export async function carregarInsumos(dia: string, postoId: number): Promise<InsumosDoRelatorio> {
    if (!relatorioDiarioPelaApi()) return insumosDoSupabase(dia, postoId);

    return insumosDaApi(dia, postoId).match(
        (insumos) => insumos,
        (erro) => {
            throw new Error(descreverErroDaApi(erro));
        }
    );
}

export const useRelatorioDiario = () => {
    const { postoAtivoId } = usePosto();
    // O dia vem do contexto: o relatório é tela de leitura, e acompanha o período de análise.
    const { dia: selectedDate, definirDia: setSelectedDate } = usePeriodo();
    const [loading, setLoading] = useState(false);
    const [shiftsData, setShiftsData] = useState<ShiftData[]>([]);
    const [totals, setTotals] = useState<DailyTotals>({
        vendas: 0,
        litros: 0,
        lucro: 0,
        despesas: 0,
        lucroLiquido: 0,
        diferenca: 0,
        projetadoMensal: 0
    });
    const [expensesDay, setExpensesDay] = useState<ExpenseData[]>([]);

    const loadData = useCallback(async () => {
        if (!postoAtivoId) return;
        
        try {
            setLoading(true);
            const relatorio = montarRelatorio(await carregarInsumos(selectedDate, postoAtivoId));
            setExpensesDay(relatorio.expensesDay);
            setShiftsData(relatorio.shiftsData);
            setTotals(relatorio.totals);
        } catch (error) {
            console.error('Error loading daily report:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, postoAtivoId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Format currency helper
    /** `null` sai como "não apurado" — nunca como R$ 0,00, que leria como "bateu". */
    const fmtMoney = (val: number | null) =>
        val === null ? 'não apurado' : val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtLitros = (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' L';

    return {
        selectedDate,
        setSelectedDate,
        loading,
        shiftsData,
        totals,
        expensesDay,
        fmtMoney,
        fmtLitros
    };
};
