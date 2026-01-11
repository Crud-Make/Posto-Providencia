import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../contexts/PostoContext';
import {
    fechamentoService,
    leituraService,
    turnoService,
    despesaService
} from '../../../services/api';
import { ShiftData, DailyTotals, ExpenseData } from '../types';

export const useRelatorioDiario = () => {
    const { postoAtivoId } = usePosto();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

            // 1. Load basic data
            const [fechamentos, leituras, turnos, despesas] = await Promise.all([
                fechamentoService.getByDate(selectedDate, postoAtivoId),
                leituraService.getByDate(selectedDate, postoAtivoId),
                turnoService.getAll(postoAtivoId),
                despesaService.getAll(postoAtivoId)
            ]);

            // Filter expenses for the specific day
            const dayExpenses = despesas
                .filter(d => d.data === selectedDate)
                .map(d => ({
                    ...d,
                    id: Number(d.id),
                    posto_id: Number(d.posto_id),
                    valor: Number(d.valor)
                })) as ExpenseData[];
                
            setExpensesDay(dayExpenses);
            const totalDespesas = dayExpenses.reduce((sum, d) => sum + Number(d.valor), 0);

            // 2. Process Shifts
            const processedShifts: ShiftData[] = turnos
                .filter(turno => {
                    const hasFechamento = fechamentos.some(f => f.turno_id === turno.id);
                    const hasLeituras = leituras.some(l => l.turno_id === turno.id);
                    const isDiario = turno.nome.toLowerCase().includes('diário') || turno.nome.toLowerCase().includes('diario');

                    // Mostra o turno se for o 'Diário' (padrão) OU se tiver dados (histórico/uso)
                    return isDiario || hasFechamento || hasLeituras;
                })
                .map(turno => {
                    // Agrega todos os fechamentos do turno (caso haja múltiplos fragmentados)
                    const fechamentosTurno = fechamentos.filter(f => f.turno_id === turno.id);

                    const totalVendasFechamento = fechamentosTurno.reduce((acc, f) => acc + Number(f.total_vendas || 0), 0);
                    const totalDiferencaFechamento = fechamentosTurno.reduce((acc, f) => acc + Number(f.diferenca || 0), 0);

                    const leiturasTurno = leituras.filter(l => l.turno_id === turno.id);

                    // Calculate Fuel Sales & Profit from Readings
                    let litrosTurno = 0;
                    let lucroTurno = 0;
                    let vendasLeituras = 0;

                    leiturasTurno.forEach(l => {
                        const volume = Number(l.leitura_final) - Number(l.leitura_inicial);
                        if (volume > 0) {
                            litrosTurno += volume;
                            const precoVenda = Number(l.bico?.combustivel?.preco_venda || 0);
                            const precoCusto = Number(l.bico?.combustivel?.preco_custo || 0);
                            const lucroUnitario = precoVenda - precoCusto;

                            vendasLeituras += volume * precoVenda;
                            lucroTurno += volume * lucroUnitario;
                        }
                    });

                    // Prioriza vendas do fechamento se existir, senão usa das leituras
                    const totalVendas = fechamentosTurno.length > 0 ? totalVendasFechamento : vendasLeituras;

                    // Lógica de proteção visual para Diferenca de Caixa
                    // Se a diferença for negativa e quase igual às vendas, provavel que não lançou pagamentos
                    let diferencaFinal = totalDiferencaFechamento;

                    // Se tiver vendas significativas e a diferença for exatamente o negativo das vendas (margem de R$ 5)
                    // Isso indica que o total pago foi 0, ou seja, provavelmente não lançaram os pagamentos ainda.
                    let statusLabel: 'Aberto' | 'Fechado' | 'Pendente' = fechamentosTurno.length > 0 ? 'Fechado' : 'Aberto';

                    if (totalVendas > 100 && Math.abs(diferencaFinal + totalVendas) < 5) {
                        diferencaFinal = 0; // Assume erro de lançamento/pendência para não mostrar quebra gigante
                        statusLabel = 'Pendente'; // Muda status visualmente
                    }

                    const frentistasNomes = fechamentosTurno
                        .map(f => f.usuario?.nome)
                        .filter((name): name is string => !!name); // Remove nulos

                    // Remove duplicatas de nomes
                    const frentistasUnicos = [...new Set(frentistasNomes)];

                    return {
                        turnoName: turno.nome,
                        turnoId: turno.id,
                        status: statusLabel,
                        vendas: totalVendas,
                        litros: litrosTurno,
                        lucro: lucroTurno,
                        diferenca: diferencaFinal,
                        frentistas: frentistasUnicos
                    };
                });

            setShiftsData(processedShifts);

            // 3. Calculate Totals
            const totalVendas = processedShifts.reduce((acc, curr) => acc + curr.vendas, 0);
            const totalLitros = processedShifts.reduce((acc, curr) => acc + curr.litros, 0);
            const totalLucro = processedShifts.reduce((acc, curr) => acc + curr.lucro, 0);
            const totalDiferenca = processedShifts.reduce((acc, curr) => acc + curr.diferenca, 0);

            setTotals({
                vendas: totalVendas,
                litros: totalLitros,
                lucro: totalLucro,
                despesas: totalDespesas,
                lucroLiquido: totalLucro - totalDespesas,
                diferenca: totalDiferenca,
                projetadoMensal: totalVendas * 30 // Naive projection
            });

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
    const fmtMoney = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
