/**
 * De onde a tela Frentistas lê e grava: Supabase (o caminho de hoje) ou API Laravel (#103), pela flag
 * da tela ({@link equipePelaApi}). As duas fontes entregam os MESMOS `PerfilFrentista` e
 * `HistoricoFrentista`; a tela não sabe qual respondeu.
 *
 * Paridade da fonte da API com o Supabase, campo a campo:
 * - lista: ativos e inativos, por nome (`.select('*').eq('posto_id').order('nome')`); `telefone`
 *   deixa de vir (a tela não o mostra) e `postoId` é o posto pedido, que é o escopo da rota;
 * - gravar: nome, admissão e status — os mesmos três campos; o posto vai na ROTA, não no corpo;
 * - "Excluir": `ativo = false` (`frentistaService.delete`), agora no servidor, que também derruba
 *   as sessões de PIN abertas do frentista;
 * - histórico: os 30 envios mais novos; a diferença é o `diferenca_calculada` gravado (string
 *   decimal → `Number`, como o PostgREST entregava), e o nome do turno sai do catálogo `/turnos`;
 * - tempo real: o canal do Supabase NÃO abre no modo API. Recarregar é depois de cada gravação
 *   (como já era); o canal do Laravel é decisão registrada ("realtime fica no Laravel").
 */
import { errAsync, ResultAsync } from 'neverthrow';
import { supabase } from '../../../services/supabase';
import { frentistaService } from '../../../services/api';
import { descreverErroDaApi } from '../../../services/api/base';
import {
    cadastrarFrentistaNaApi,
    desativarFrentistaNaApi,
    editarFrentistaNaApi,
    equipePelaApi,
    lerEquipeDaApi,
    lerHistoricoDaEquipeDaApi,
    type FrentistaDaEquipe,
    type HistoricoDaApi,
} from '../../../services/api/equipe.api';
import type { DadosFormularioFrentista, HistoricoFrentista, PerfilFrentista } from '../types';

const mensagem = (erro: unknown, padrao: string): string => (erro instanceof Error ? erro.message : padrao);

/** Um frentista da API no perfil da tela. Exportada para o teste de paridade. */
export function perfilDaApi(f: FrentistaDaEquipe, postoId: number): PerfilFrentista {
    return { id: String(f.id), nome: f.nome, status: f.ativo ? 'Ativo' : 'Inativo', dataAdmissao: f.data_admissao, foto: f.foto, postoId };
}

/** O histórico da API nas linhas do detalhe. Exportada para o teste de paridade. */
export function historicoDaApi(dados: HistoricoDaApi): HistoricoFrentista[] {
    return dados.itens.map((h) => {
        // Mesma leitura do caminho do Supabase: `diferenca_calculada` nula conta como zero.
        const diferenca = h.diferenca_calculada === null ? 0 : Number(h.diferenca_calculada);
        const turnoId = h.fechamento?.turno_id ?? null;
        return {
            id: String(h.id),
            data: h.fechamento?.data ?? 'N/A',
            turno: (turnoId === null ? undefined : dados.nomeDoTurno.get(turnoId)) ?? 'N/A',
            valor: diferenca,
            status: diferenca === 0 ? 'OK' : 'Divergente',
        };
    });
}

/* ------------------------------------------------------------ o caminho de hoje (Supabase) --- */

async function equipeDoSupabase(postoId: number): Promise<PerfilFrentista[]> {
    const { data, error } = await supabase.from('Frentista').select('*').eq('posto_id', postoId).order('nome');
    if (error !== null) throw error;

    return (data ?? []).map((f) => ({
        id: String(f.id),
        nome: f.nome,
        status: f.ativo ? 'Ativo' : 'Inativo',
        dataAdmissao: f.data_admissao,
        // `telefone` é opcional no tipo; a coluna é `string | null`. Nulo = sem a chave.
        ...(f.telefone === null ? {} : { telefone: f.telefone }),
        foto: f.foto ?? null,
        postoId: f.posto_id,
    }));
}

type FechamentoFrentistaRow = {
    id: number;
    diferenca_calculada?: number | null;
    fechamento?: { data?: string; turno?: { nome?: string } | null } | null;
};

/** O `x || 0` de antes, por extenso: nulo, ausente e `NaN` viram zero. */
const numeroOuZero = (valor: number | null | undefined): number => (valor === null || valor === undefined || Number.isNaN(valor) ? 0 : valor);

/** O `x || 'N/A'` de antes, por extenso: nulo, ausente e texto vazio viram `'N/A'`. */
const textoOuNA = (valor: string | null | undefined): string => (valor === null || valor === undefined || valor === '' ? 'N/A' : valor);

async function historicoDoSupabase(frentistaId: string): Promise<HistoricoFrentista[]> {
    const { data, error } = await supabase
        .from('FechamentoFrentista')
        .select(`
            *,
            fechamento:Fechamento(data, turno:Turno(nome))
        `)
        .eq('frentista_id', Number(frentistaId))
        .order('id', { ascending: false })
        .limit(30);

    if (error !== null) throw error;

    return ((data ?? []) as FechamentoFrentistaRow[]).map((h) => {
        // `diferenca_calculada` é a diferença de caixa canônica (encerrante − conferido), gravada no
        // envio do fechamento. Positivo = FALTA, negativo = SOBRA. (Ver o histórico do arquivo: a
        // soma manual antiga ignorava moedas, débito e crédito e acusava divergência falsa.)
        const diferenca = numeroOuZero(h.diferenca_calculada);
        return {
            id: String(h.id),
            data: textoOuNA(h.fechamento?.data),
            turno: textoOuNA(h.fechamento?.turno?.nome),
            valor: diferenca,
            status: diferenca === 0 ? 'OK' : 'Divergente',
        };
    });
}

/* ---------------------------------------------------------------------------- a escolha ------ */

/** A lista da tela. O erro é a mensagem para o banner. */
export function carregarEquipe(postoId: number): ResultAsync<PerfilFrentista[], string> {
    if (equipePelaApi()) {
        return lerEquipeDaApi(postoId).map((lista) => lista.map((f) => perfilDaApi(f, postoId))).mapErr(descreverErroDaApi);
    }
    return ResultAsync.fromPromise(equipeDoSupabase(postoId), (erro) => mensagem(erro, 'Erro ao carregar lista de frentistas'));
}

/**
 * Cadastra (sem `id`) ou edita. No caminho do Supabase o `ApiResponse` do service continua sem ser
 * lido — é o comportamento de hoje, e fica intacto; na API a recusa volta como erro.
 */
export function gravarFrentista(postoId: number, dados: DadosFormularioFrentista, id?: string): ResultAsync<void, string> {
    if (equipePelaApi()) {
        const gravacao = id === undefined ? cadastrarFrentistaNaApi(postoId, dados) : editarFrentistaNaApi(postoId, Number(id), dados);
        return gravacao.map(() => undefined).mapErr(descreverErroDaApi);
    }
    const corpo = { ...dados, posto_id: postoId };
    const pedido = id === undefined ? frentistaService.create(corpo) : frentistaService.update(Number(id), corpo);
    return ResultAsync.fromPromise(pedido, (erro) => mensagem(erro, 'Erro ao salvar frentista')).map(() => undefined);
}

/** O "Excluir" da tela: desativa, não apaga. */
export function desativarFrentista(postoId: number, id: string): ResultAsync<void, string> {
    if (equipePelaApi()) {
        return desativarFrentistaNaApi(postoId, Number(id)).map(() => undefined).mapErr(descreverErroDaApi);
    }
    return ResultAsync.fromPromise(frentistaService.delete(Number(id)), (erro) => mensagem(erro, 'Erro ao excluir frentista')).map(() => undefined);
}

/** O histórico recente do detalhe. `postoId` só é usado pela API (o Supabase não filtrava posto). */
export function carregarHistorico(frentistaId: string, postoId: number | undefined): ResultAsync<HistoricoFrentista[], string> {
    if (equipePelaApi()) {
        if (postoId === undefined) {
            return errAsync('Frentista sem posto para ler o histórico');
        }
        return lerHistoricoDaEquipeDaApi(postoId, Number(frentistaId)).map(historicoDaApi).mapErr(descreverErroDaApi);
    }
    return ResultAsync.fromPromise(historicoDoSupabase(frentistaId), (erro) => mensagem(erro, 'Erro ao carregar histórico'));
}

/**
 * Recarrega a lista quando a tabela muda — só no caminho do Supabase. No modo API não há canal: a
 * lista é relida depois de cada gravação. Devolve a função que desliga.
 */
export function assinarMudancasDaEquipe(aoMudar: () => void): () => void {
    if (equipePelaApi()) {
        return () => undefined;
    }
    const canal = supabase
        .channel('frentistas_changes_gestao')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'Frentista' }, aoMudar)
        .subscribe();
    return () => {
        void canal.unsubscribe();
    };
}
