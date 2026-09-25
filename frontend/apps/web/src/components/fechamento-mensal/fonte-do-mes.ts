/**
 * De onde a aba Fechamento Mensal lê o mês: API Laravel com `VITE_API_URL`, Supabase sem ela.
 *
 * @remarks
 * A troca é aqui, e não dentro de `fechamentoMensalService`/`leituraService`, pela regra de todas as
 * fatias do Fechamento de Caixa: os services têm outros chamadores. Pela API o resumo diário vem sem
 * lucro (`FechamentoMensalResumo`), e a tela o mostra como "—".
 *
 * Os contratos de erro são os de sempre: o resumo LANÇA (a tela mostra "Não foi possível carregar"),
 * os encerrantes devolvem o consolidado vazio e registram no console, a checagem de pendência é
 * `false` em erro.
 */
import { descreverErroDaApi, urlDaApi } from '../../services/api/base';
import { leituraService } from '../../services/api';
import { CONSOLIDADO_VAZIO, type EncerranteMensalConsolidado } from '../../services/api/encerrantes-do-mes';
import { lerEncerrantesMensalDaApi, lerResumoMensalDaApi, limitesDoMesCivil } from '../../services/api/fechamentoMensal.api';
import { fechamentoMensalService, type FechamentoMensalResumo } from '../../services/api/fechamentoMensal.service';
import { lerLeiturasDoPeriodoDaApi } from '../../services/api/leitura.api';

export async function lerResumoDoMes(postoId: number, mes: number, ano: number): Promise<FechamentoMensalResumo[]> {
    if (urlDaApi() === null) {
        return fechamentoMensalService.getResumoMensal(postoId, mes, ano);
    }
    const lido = await lerResumoMensalDaApi(postoId, mes, ano);
    if (lido.isErr()) {
        throw new Error(descreverErroDaApi(lido.error));
    }
    return lido.value;
}

export async function lerEncerrantesDoMes(postoId: number, mes: number, ano: number): Promise<EncerranteMensalConsolidado> {
    if (urlDaApi() === null) {
        return fechamentoMensalService.getEncerrantesMensal(postoId, mes, ano);
    }
    const lido = await lerEncerrantesMensalDaApi(postoId, mes, ano);
    if (lido.isErr()) {
        console.error('Erro ao buscar leituras do mês:', descreverErroDaApi(lido.error));
        return CONSOLIDADO_VAZIO;
    }
    return lido.value;
}

/** Há leitura lançada no mês? (o aviso "dados pendentes" de mês sem fechamento) */
export async function haLeiturasNoMes(postoId: number, mes: number, ano: number): Promise<boolean> {
    const { inicio, fim } = limitesDoMesCivil(mes, ano);
    if (urlDaApi() === null) {
        const res = await leituraService.getByDateRange(inicio, fim, postoId);
        return res.success && res.data.length > 0;
    }
    const lido = await lerLeiturasDoPeriodoDaApi(postoId, inicio, fim);
    return lido.isOk() && lido.value.length > 0;
}
