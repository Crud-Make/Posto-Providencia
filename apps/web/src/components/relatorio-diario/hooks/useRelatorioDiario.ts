/**
 * Hook do Relatório Diário.
 *
 * @remarks
 * Carrega fechamentos, leituras, turnos e despesas do posto e consolida totais do dia.
 */
import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import {
    fechamentoService,
    leituraService,
    turnoService,
    despesaService
} from '../../../services/api';
import { ShiftData, DailyTotals, ExpenseData } from '../types';
import type { ApiResponse } from '../../../types/ui/response-types';
import { isSuccess } from '../../../types/ui/response-types';
import type { DBDespesa } from '../../../types/database/index';
import { hojeIso, semLancamento } from '@posto/utils';

/**
 * Fechamento com os campos necessários para o relatório diário.
 */
interface FechamentoDiario {
    turno_id: number;
    total_vendas?: number | null;
    diferenca?: number | null;
    /**
     * `'ABERTO'` enquanto o dia não foi consolidado pelo painel, `'FECHADO'` depois.
     *
     * @remarks
     * Campo decisivo, e que este hook ignorava. O PWA cria o `Fechamento` pai com
     * `total_vendas`, `total_recebido` e `diferenca` zerados (`getOrCreateFechamento`)
     * e nunca os atualiza — quem preenche é o passo 5 de `useSubmissaoFechamento`,
     * ao salvar pelo painel. Sem olhar o status, um dia só lançado pelo celular
     * aparecia como "FECHADO" com R$ 0,00 de venda. Medido em 13/08/2026:
     * `status = 'ABERTO'` ⟺ `total_vendas = 0`, em 12 de 12 casos; os 201 FECHADO
     * têm todos o valor preenchido.
     */
    status?: string | null;
    usuario?: {
        nome?: string | null;
    } | null;
}

/**
 * Leitura com os campos necessários para cálculo de volume e lucro.
 */
interface LeituraDiaria {
    turno_id: number;
    leitura_inicial: number;
    leitura_final: number;
    /** Preço do litro NO DIA da leitura, carimbado na submissão. */
    preco_litro?: number | null;
    /** Venda do bico no dia, gravada na submissão (`litros × preco_litro`). */
    valor_total?: number | null;
    bico?: {
        combustivel?: {
            preco_venda?: number | null;
            preco_custo?: number | null;
        } | null;
    } | null;
}

/**
 * Venda e lucro de uma leitura, a preço DO DIA.
 *
 * @remarks
 * O preço vem do que foi carimbado na própria leitura (`preco_litro`/
 * `valor_total`); o `preco_venda` do cadastro é só fallback para linha antiga
 * sem preço gravado. Era daqui que saía o bug do "preço único": dia de janeiro
 * (R$ 6,28) exibido a preço de agosto (R$ 6,98) — o cadastro guarda um preço
 * só, o de hoje. O custo segue vindo do cadastro por falta de custo carimbado
 * na leitura (o custo histórico correto vive na RPC `get_dashboard_proprietario`);
 * o lucro daqui é aproximação de tela, não fórmula canônica.
 */
export function vendaLucroDaLeitura(l: LeituraDiaria): { volume: number; venda: number; lucro: number } {
    const volume = Number(l.leitura_final) - Number(l.leitura_inicial);
    if (volume <= 0) return { volume: 0, venda: 0, lucro: 0 };

    const precoDoDia = Number(l.preco_litro ?? l.bico?.combustivel?.preco_venda ?? 0);
    const precoCusto = Number(l.bico?.combustivel?.preco_custo ?? 0);
    const venda = l.valor_total != null ? Number(l.valor_total) : volume * precoDoDia;

    return { volume, venda, lucro: volume * (precoDoDia - precoCusto) };
}

/**
 * Turno do posto.
 */
interface TurnoDiario {
    id: number;
    nome: string;
}

/**
 * Extrai o `data` de uma `ApiResponse` com mensagem de erro consistente.
 *
 * @param response - Resposta retornada pelos services
 */
function extractApiData<T>(response: ApiResponse<T>): T {
    if (isSuccess(response)) return response.data;
    throw new Error(response.error || 'Erro ao buscar dados do serviço');
}

/**
 * Normaliza uma despesa do banco para o formato de UI.
 *
 * @param despesa - Registro do banco
 */
function mapDbDespesaToUi(despesa: DBDespesa): ExpenseData {
    return {
        id: String(despesa.id),
        descricao: despesa.descricao,
        categoria: despesa.categoria ?? 'Outros',
        valor: Number(despesa.valor),
        data: despesa.data,
        status: despesa.status,
        posto_id: Number(despesa.posto_id),
        data_pagamento: despesa.data_pagamento ?? null,
        observacoes: despesa.observacoes ?? undefined
    };
}

export const useRelatorioDiario = () => {
    const { postoAtivoId } = usePosto();
    const [selectedDate, setSelectedDate] = useState(hojeIso());
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
            // [18/01 10:34] Extraído payload de ApiResponse para evitar `filter is not a function` em despesas.
            const [fechamentosRes, leiturasRes, turnosRes, despesasRes] = await Promise.all([
                fechamentoService.getByDate(selectedDate, postoAtivoId),
                leituraService.getByDate(selectedDate, postoAtivoId),
                turnoService.getAll(postoAtivoId),
                despesaService.getAll(postoAtivoId)
            ]);

            const fechamentos = extractApiData(fechamentosRes as ApiResponse<FechamentoDiario[]>);
            const leituras = extractApiData(leiturasRes as ApiResponse<LeituraDiaria[]>);
            const turnos = extractApiData(turnosRes as ApiResponse<TurnoDiario[]>);
            // [18/01 10:40] Ajustado mapeamento de Despesa do banco para UI (id string).
            const despesasDb = extractApiData(despesasRes as ApiResponse<DBDespesa[]>);
            const despesas = despesasDb.map(mapDbDespesaToUi);

            // Filter expenses for the specific day
            const dayExpenses = despesas
                .filter(d => d.data === selectedDate)
                .map(d => ({
                    ...d,
                    valor: Number(d.valor)
                }));
                
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
                        const { volume, venda, lucro } = vendaLucroDaLeitura(l);
                        litrosTurno += volume;
                        vendasLeituras += venda;
                        lucroTurno += lucro;
                    });

                    // O total do `Fechamento` só vale depois que o dia foi CONSOLIDADO pelo
                    // painel — antes disso ele é zero por construção, e usá-lo mostrava
                    // "R$ 0,00 vendidos" num dia com 1.288 L na bomba. Enquanto o dia está
                    // aberto, a venda real vem das leituras, que é a mesma fonte do dashboard.
                    const consolidado =
                        fechamentosTurno.length > 0 &&
                        fechamentosTurno.every(f => f.status === 'FECHADO');

                    const totalVendas = consolidado ? totalVendasFechamento : vendasLeituras;

                    // A diferença de caixa vai para a tela como está gravada, sempre.
                    // [13/08/2026] Aqui existia uma heurística que a ZERAVA quando
                    // `|diferenca + totalVendas| < 5`, para "não mostrar quebra gigante".
                    // Ela estava errada duas vezes: o sinal (com `diferenca = encerrante −
                    // conferido`, "nada lançado" dá +totalVendas, então a condição pedia
                    // 2×totalVendas < 5 — 0 de 201 fechamentos do histórico a satisfaziam),
                    // e o próprio ato de zerar, que apaga da tela justamente o número que o
                    // sistema existe para acusar. O estado agora é pergunta, não reescrita.
                    const diferencaFinal = totalDiferencaFechamento;

                    // 'Aberto'   = o turno nem começou (nenhum fechamento criado).
                    // 'Pendente' = o frentista lançou pelo PWA, mas ninguém fechou o dia no
                    //              painel. É o estado dos 12 dias achados em 13/08/2026, o mais
                    //              antigo parado desde 26/07 — e que a tela mostrava como
                    //              "FECHADO, R$ 0,00", ou seja, um dia sem conferência nenhuma
                    //              com cara de dia conferido e batido.
                    // 'Fechado'  = consolidado pelo painel, com os totais gravados.
                    const statusLabel: 'Aberto' | 'Fechado' | 'Pendente' =
                        fechamentosTurno.length === 0
                            ? 'Aberto'
                            : !consolidado || semLancamento(totalVendas, totalDiferencaFechamento)
                                ? 'Pendente'
                                : 'Fechado';

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
