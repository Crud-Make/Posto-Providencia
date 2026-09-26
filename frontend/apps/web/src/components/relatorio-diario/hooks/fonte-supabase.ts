/**
 * Insumos do Relatório Diário lidos do Supabase — o caminho de sempre, sem `VITE_API_RELATORIO`.
 *
 * @remarks Movido de `useRelatorioDiario.ts` sem mudar consulta nem filtro. Falha vira `throw`,
 *          como antes: o hook a registra no console e a tela fica com o estado anterior.
 */
import {
    fechamentoService,
    leituraService,
    compraService,
    despesaService
} from '../../../services/api';
import { custoMedioPorCombustivel } from '../../../services/custo-do-mes';
import { mesCivil } from '../../../utils/periodo';
import type { ApiResponse } from '../../../types/ui/response-types';
import { isSuccess } from '../../../types/ui/response-types';
import type { DBDespesa } from '../../../types/database/index';
import type { ExpenseData } from '../types';
import type { FechamentoDiario, InsumosDoRelatorio, LeituraDiaria } from './insumos';

/**
 * Extrai o `data` de uma `ApiResponse` com mensagem de erro consistente.
 *
 * @param response - Resposta retornada pelos services
 */
function extractApiData<T>(response: ApiResponse<T>): T {
    if (isSuccess(response)) return response.data;
    throw new Error(response.error !== '' ? response.error : 'Erro ao buscar dados do serviço');
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
        // Sem observação a chave fica de fora — o que `?? undefined` queria dizer, e que o
        // `exactOptionalPropertyTypes` recusava (TS2375 congelado no hook, pago ao mover).
        ...(despesa.observacoes == null ? {} : { observacoes: despesa.observacoes })
    };
}

/** Os quatro insumos do dia pelo Supabase. */
export async function insumosDoSupabase(selectedDate: string, postoAtivoId: number): Promise<InsumosDoRelatorio> {
    // [18/01 10:34] Extraído payload de ApiResponse para evitar `filter is not a function` em despesas.
    // Custo do litro: compra do MÊS do dia, por combustível (ver `vendaLucroDaLeitura`).
    const mesDoDia = mesCivil(selectedDate);
    const [fechamentosRes, leiturasRes, despesasRes, comprasRes] = await Promise.all([
        fechamentoService.getByDate(selectedDate, postoAtivoId),
        leituraService.getByDate(selectedDate, postoAtivoId),
        despesaService.getAll(postoAtivoId),
        compraService.getByDateRange(mesDoDia.inicio, mesDoDia.fim, postoAtivoId)
    ]);

    const fechamentos = extractApiData(fechamentosRes as ApiResponse<FechamentoDiario[]>);
    const leituras = extractApiData(leiturasRes as ApiResponse<LeituraDiaria[]>);
    const custoDoMes = custoMedioPorCombustivel(isSuccess(comprasRes) ? comprasRes.data : []);
    // [18/01 10:40] Ajustado mapeamento de Despesa do banco para UI (id string).
    const despesasDb = extractApiData(despesasRes as ApiResponse<DBDespesa[]>);
    const despesas = despesasDb.map(mapDbDespesaToUi);

    // Filter expenses for the specific day
    const despesasDoDia = despesas
        .filter(d => d.data === selectedDate)
        .map(d => ({
            ...d,
            valor: Number(d.valor)
        }));

    return { fechamentos, leituras, despesasDoDia, custoDoMes };
}
