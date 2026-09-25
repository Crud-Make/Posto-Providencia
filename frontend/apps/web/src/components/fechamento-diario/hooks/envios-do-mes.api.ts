/**
 * Os envios dos frentistas no mês, pela API Laravel — a entrada do resumo mensal da aba
 * Detalhamento (`useResumoMensalFrentistas`), que antes vinha de `fechamentoFrentistaService.getByPeriodo`.
 *
 * @remarks
 * Duas idas ao servidor em paralelo, ambas já existentes: `GET /sessoes?data=&ate=` (o mês; o
 * recorte é o mesmo `[inicio 00:00Z, fim+1 00:00Z)` dos `Fechamento` que o Supabase usava) e
 * `GET /frentistas` (o nome, que o Supabase trazia pelo join). Os números passam por
 * `paraSessoesDoDia` — string decimal → `Number()`, `null` continua `null` — e a conta é a de
 * sempre, em `montarResumoMensal`; aqui não se soma nada.
 *
 * Sessão de frentista que não está no catálogo fica sem nome e a tela mostra "Sem frentista",
 * exatamente como o join vazio do Supabase.
 */
import { ResultAsync } from 'neverthrow';
import { descreverErroDaApi } from '../../../services/api/base';
import { lerSessoesDoDiaDaApi, type SessaoDoDia } from '../../../services/api/fechamentoFrentista.api';
import { lerNomesDosFrentistasDaApi } from '../../../services/api/frentista.api';
import { type ApiResponse, createErrorResponse, createSuccessResponse } from '../../../types/ui/response-types';

export type EnvioDoMes = SessaoDoDia & { readonly frentista: { readonly nome: string } | null };

export function lerEnviosDoMesDaApi(postoId: number, inicio: string, fim: string): Promise<ApiResponse<readonly EnvioDoMes[]>> {
    return ResultAsync.combine([lerSessoesDoDiaDaApi(postoId, inicio, fim), lerNomesDosFrentistasDaApi(postoId)] as const).match(
        ([sessoes, nomes]) =>
            createSuccessResponse(
                sessoes.map((sessao): EnvioDoMes => {
                    const nome = nomes.get(sessao.frentista_id);
                    return { ...sessao, frentista: nome === undefined ? null : { nome } };
                }),
            ),
        (erro) => createErrorResponse(descreverErroDaApi(erro), 'FETCH_ERROR'),
    );
}
