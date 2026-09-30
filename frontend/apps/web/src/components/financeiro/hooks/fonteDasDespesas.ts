/**
 * De onde a aba Receitas e Despesas lança e lê despesas: Supabase (o caminho de hoje) ou API
 * Laravel (#103), pela flag da tela ({@link despesasPelaApi}). As duas fontes entregam o mesmo
 * resultado para a tela; a tela não sabe qual respondeu.
 *
 * Paridade da API com o Supabase:
 * - Nova Despesa: os mesmos campos do formulário, `valor` em string decimal; o posto vai na rota;
 * - Despesas Fixas e Taxas de Cartão: as mesmas colunas de `despesaFixaService.lancar`
 *   (`status: 'pendente'`, `recorrente: true`), na `data` que a TELA escolheu;
 * - Fixas pendentes: as mesmas duas leituras (recorrentes do posto + as do mês) e a MESMA função
 *   pura `fixasPendentes` do `@posto/utils` — a regra não sai do cliente;
 * - o lançamento pela API leva uma `chave`: repetir com a mesma chave não lança em dobro.
 */
import { errAsync, ResultAsync } from 'neverthrow';
import { fixasPendentes, type FixaPendente } from '@posto/utils';
import { despesaService } from '../../../services/api';
import { despesaFixaService, type LancamentoFixa } from '../../../services/api/despesa-fixa.service';
import { descreverErroDaApi, type ErroDaApi } from '../../../services/api/base';
import {
    despesasPelaApi,
    lancarDespesasNaApi,
    lerDespesasDoPeriodo,
    lerDespesasRecorrentes,
    valorEmTexto,
    type DespesaParaLancar,
} from '../../../services/api/despesas.api';
import { isSuccess } from '../../../types/ui/response-types';
import { ultimoDiaDoMes, deIsoLocal } from '../../../utils/periodo';
import type { DespesaFormData } from '../../despesas/types';

/** Recusa de regra chega com a frase pronta; o resto vira diagnóstico. */
const mensagem = (erro: ErroDaApi): string => (erro.tipo === 'recusado' ? erro.mensagem : descreverErroDaApi(erro));

/** A despesa do formulário no item do lote. Exportada para o teste de paridade. */
export function itemDaNovaDespesa(d: DespesaFormData): DespesaParaLancar {
    const obs = d.observacoes.trim();
    return {
        descricao: d.descricao,
        categoria: d.categoria === '' ? null : d.categoria,
        categoria_id: d.categoria_id ?? null,
        valor: valorEmTexto(d.valor),
        data: d.data,
        status: d.status,
        recorrente: false,
        data_pagamento: d.data_pagamento,
        observacoes: obs === '' ? null : obs,
    };
}

/** Um lançamento de Fixa/Taxa no item do lote — as colunas de `despesaFixaService.lancar`. */
export function itemDoLancamentoMensal(l: LancamentoFixa, data: string): DespesaParaLancar {
    return {
        descricao: l.descricao,
        categoria: l.categoria,
        categoria_id: l.categoriaId ?? null,
        valor: valorEmTexto(l.valor),
        data,
        status: 'pendente',
        recorrente: true,
        data_pagamento: null,
        observacoes: null,
    };
}

/** Nova Despesa. `chave` só vale no caminho da API. */
export function criarDespesa(postoId: number, d: DespesaFormData, chave: string): ResultAsync<void, string> {
    if (despesasPelaApi()) {
        return lancarDespesasNaApi(postoId, chave, [itemDaNovaDespesa(d)]).map(() => undefined).mapErr(mensagem);
    }
    return ResultAsync.fromPromise(despesaService.create(d), () => 'Erro ao salvar a despesa').andThen((res) =>
        res.success ? ResultAsync.fromSafePromise(Promise.resolve(undefined)) : errAsync('Erro ao salvar a despesa'),
    );
}

/** Despesas Fixas e Taxas de Cartão: quantas linhas foram gravadas. */
export function lancarMensais(postoId: number, lancamentos: readonly LancamentoFixa[], data: string, chave: string): ResultAsync<number, string> {
    if (despesasPelaApi()) {
        if (lancamentos.length === 0) return ResultAsync.fromSafePromise(Promise.resolve(0));
        return lancarDespesasNaApi(postoId, chave, lancamentos.map((l) => itemDoLancamentoMensal(l, data))).map((gravadas) => gravadas.length).mapErr(mensagem);
    }
    return ResultAsync.fromPromise(despesaFixaService.lancar(lancamentos, data, postoId), () => 'Erro ao lançar').andThen((res) =>
        isSuccess(res) ? ResultAsync.fromSafePromise(Promise.resolve(res.data)) : errAsync(res.error),
    );
}

/** As Fixas que ainda não foram lançadas no mês `aaaa-mm`. */
export function fixasPendentesDoMes(postoId: number, mes: string): ResultAsync<FixaPendente[], string> {
    if (!despesasPelaApi()) {
        return ResultAsync.fromPromise(despesaFixaService.pendentesDoMes(mes, postoId), () => 'Erro ao buscar as fixas').andThen((res) =>
            isSuccess(res) ? ResultAsync.fromSafePromise(Promise.resolve(res.data)) : errAsync(res.error),
        );
    }
    const fim = ultimoDiaDoMes(deIsoLocal(`${mes}-01`));
    return ResultAsync.combine([lerDespesasRecorrentes(postoId), lerDespesasDoPeriodo(postoId, `${mes}-01`, fim)] as const)
        .map(([recorrentes, doMes]) =>
            fixasPendentes(
                recorrentes.map((d) => ({ descricao: d.descricao, categoria: d.categoria, valor: Number(d.valor), data: d.data, categoriaId: d.categoria_id })),
                doMes.map((d) => d.descricao),
                mes,
            ),
        )
        .mapErr(mensagem);
}

/** Descrição e categoria das despesas do mês — o que a tela usa para sugerir os provedores de cartão. */
export function despesasDoMes(postoId: number, ano: number, mes: number): ResultAsync<{ descricao: string; categoria: string | null }[], string> {
    if (despesasPelaApi()) {
        const aaaamm = `${ano}-${String(mes).padStart(2, '0')}`;
        return lerDespesasDoPeriodo(postoId, `${aaaamm}-01`, ultimoDiaDoMes(deIsoLocal(`${aaaamm}-01`))).mapErr(mensagem);
    }
    return ResultAsync.fromPromise(despesaService.getByMonth(ano, mes, postoId), () => 'Erro ao buscar despesas').andThen((res) =>
        isSuccess(res) ? ResultAsync.fromSafePromise(Promise.resolve(res.data.map((d) => ({ descricao: d.descricao, categoria: d.categoria ?? null })))) : errAsync(res.error),
    );
}
