import type { ResultAsync } from 'neverthrow';
import type { FormaPagamento, Frentista } from '../../types/database/index';
import { createErrorResponse, createSuccessResponse, type ApiResponse } from '../../types/ui/response-types';
import { descreverErroDaApi, type ErroDaApi } from './base';
import { lerFrentistasDaApi } from './frentista.api';
import { lerFormasDePagamentoDaApi } from './formaPagamento.api';
import { lerSessoesDoDiaDaApi, type SessaoDoDia } from './fechamentoFrentista.api';
import { lerPresencasDaApi } from './presenca.api';
import type { PresencaFrentista } from '@posto/utils';

/**
 * Cadastro e fechamentos do dia do Dashboard pela API (#100, fatia 3) — o que o `aggregator` ainda
 * buscava no Supabase mesmo com o corte ligado. Com o login pela API não há sessão do Supabase, e
 * sem isto a tela ficava presa carregando.
 *
 * @remarks Devolve no formato `ApiResponse` do caminho Supabase para o `aggregator` consumir igual.
 *          Frentistas vêm ordenados por nome, como o Supabase entregava — a tabela de fechamentos e
 *          o filtro não mudam de ordem. (Estoque saiu do Dashboard na mesma fatia: só alimentava o
 *          `maxCapacity`, campo que nenhum componente lia.)
 */
export type CadastroEFechamentoDoDashboard = [
    ApiResponse<Frentista[]>,
    ApiResponse<FormaPagamento[]>,
    ApiResponse<SessaoDoDia[]>,
];

function comoResposta<T>(lido: ResultAsync<T, ErroDaApi>): Promise<ApiResponse<T>> {
    return lido.match(
        (dado) => createSuccessResponse(dado),
        (erro) => createErrorResponse(descreverErroDaApi(erro), 'FETCH_ERROR'),
    );
}

export function frentistasPorNome(frentistas: readonly Frentista[]): Frentista[] {
    return [...frentistas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function cadastroEFechamentoDaApi(postoId: number, inicio: string, fim: string): Promise<CadastroEFechamentoDoDashboard> {
    return Promise.all([
        comoResposta(lerFrentistasDaApi(postoId).map(frentistasPorNome)),
        comoResposta(lerFormasDePagamentoDaApi(postoId)),
        comoResposta(lerSessoesDoDiaDaApi(postoId, inicio, fim)),
    ]);
}

/** Frentistas do filtro do Dashboard pela API, na ordem por nome que o Supabase entregava. */
export function frentistasDoFiltroDaApi(postoId: number): Promise<ApiResponse<Frentista[]>> {
    return comoResposta(lerFrentistasDaApi(postoId).map(frentistasPorNome));
}

/** Presença para o card "quem está no posto", no formato do `presencaService`. */
export function presencasDaApi(postoId: number): Promise<ApiResponse<PresencaFrentista[]>> {
    return comoResposta(lerPresencasDaApi(postoId));
}
