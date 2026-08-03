/**
 * Serviço de limpeza de um MÊS de movimento.
 *
 * @remarks
 * **ATENÇÃO: destrutivo.** Apaga leituras e fechamentos de um mês inteiro.
 * Existe para limpar dado de teste durante a implantação, quando o posto ainda
 * está aprendendo o fluxo e envia encerrante errado de propósito.
 *
 * ⚠️ **A contagem depois de apagar não é firula — é a única prova.** O painel
 * fala com o banco como `anon`, e a RLS restringe o `DELETE` de `Leitura` aos
 * últimos 7 dias (migração de 31/07). O PostgREST devolve **204 tanto para
 * "apagou" quanto para "a RLS barrou"**, então acreditar na resposta do DELETE
 * faria o botão anunciar sucesso sem ter apagado nada. Por isso todo caminho
 * aqui reconta e devolve o que de fato saiu.
 */

import { supabase } from './base.ts';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/** Quantas linhas de movimento um mês tem, por tabela. */
export interface ContagemDoMes {
  readonly leituras: number;
  readonly fechamentos: number;
  readonly fechamentosFrentista: number;
  readonly recebimentos: number;
}

/** O que a limpeza encontrou e o que conseguiu apagar. */
export interface ResultadoLimpeza {
  readonly antes: ContagemDoMes;
  readonly depois: ContagemDoMes;
  /** `true` quando sobrou linha — sinal de RLS barrando, não de erro de rede. */
  readonly sobrou: boolean;
}

const vazio = (): ContagemDoMes => ({
  leituras: 0, fechamentos: 0, fechamentosFrentista: 0, recebimentos: 0,
});

/** Primeiro instante do mês e primeiro instante do mês seguinte (`[de, ate)`). */
function limitesDoMes(mesIso: string): { de: string; ate: string } {
  const [ano, mes] = mesIso.split('-').map(Number);
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const proximoMes = mes === 12 ? 1 : mes + 1;

  return {
    de: `${mesIso}-01`,
    ate: `${proximoAno}-${String(proximoMes).padStart(2, '0')}-01`,
  };
}

/** Ids dos `Fechamento` do mês — âncora de tudo que não tem data própria. */
async function idsDosFechamentos(mesIso: string, postoId?: number): Promise<number[]> {
  const { de, ate } = limitesDoMes(mesIso);

  let query = supabase.from('Fechamento').select('id').gte('data', de).lt('data', ate);
  if (postoId) query = query.eq('posto_id', postoId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(f => f.id);
}

async function contar(mesIso: string, postoId?: number): Promise<ContagemDoMes> {
  const { de, ate } = limitesDoMes(mesIso);
  const ids = await idsDosFechamentos(mesIso, postoId);

  let leiturasQuery = supabase
    .from('Leitura')
    .select('id', { count: 'exact', head: true })
    .gte('data', de)
    .lt('data', ate);
  if (postoId) leiturasQuery = leiturasQuery.eq('posto_id', postoId);

  const { count: leituras, error: erroLeituras } = await leiturasQuery;
  if (erroLeituras) throw new Error(erroLeituras.message);

  if (ids.length === 0) {
    return { ...vazio(), leituras: leituras ?? 0 };
  }

  const [ff, rec] = await Promise.all([
    supabase.from('FechamentoFrentista').select('id', { count: 'exact', head: true }).in('fechamento_id', ids),
    supabase.from('Recebimento').select('id', { count: 'exact', head: true }).in('fechamento_id', ids),
  ]);

  if (ff.error) throw new Error(ff.error.message);
  if (rec.error) throw new Error(rec.error.message);

  return {
    leituras: leituras ?? 0,
    fechamentos: ids.length,
    fechamentosFrentista: ff.count ?? 0,
    recebimentos: rec.count ?? 0,
  };
}

export const limpezaMesService = {
  /**
   * Quanto movimento existe no mês — para mostrar ANTES de apagar.
   *
   * @param mesIso - Mês no formato `aaaa-mm`.
   * @param postoId - ID do posto (opcional).
   */
  async contarDoMes(mesIso: string, postoId?: number): Promise<ApiResponse<ContagemDoMes>> {
    try {
      return createSuccessResponse(await contar(mesIso, postoId));
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro ao contar o mês');
    }
  },

  /**
   * Apaga o movimento de um mês inteiro.
   *
   * @param mesIso - Mês no formato `aaaa-mm`.
   * @param postoId - ID do posto (opcional).
   *
   * @returns O que existia, o que restou e se sobrou alguma coisa.
   *
   * @remarks
   * Ordem de exclusão respeita a FK: filhos de `Fechamento` primeiro, o
   * `Fechamento` por último. `Leitura` é independente e sai no meio.
   *
   * Não lança quando sobra linha — devolve `sobrou: true`. Sobrar é resposta
   * legítima da RLS (dia fora da janela de 7 dias), não falha de execução, e
   * quem chama precisa poder dizer isso na tela.
   */
  async apagarMes(mesIso: string, postoId?: number): Promise<ApiResponse<ResultadoLimpeza>> {
    try {
      const antes = await contar(mesIso, postoId);
      const { de, ate } = limitesDoMes(mesIso);
      const ids = await idsDosFechamentos(mesIso, postoId);

      if (ids.length > 0) {
        const { error: erroRec } = await supabase.from('Recebimento').delete().in('fechamento_id', ids);
        if (erroRec) return createErrorResponse(erroRec.message, 'DELETE_ERROR');

        const { error: erroFf } = await supabase.from('FechamentoFrentista').delete().in('fechamento_id', ids);
        if (erroFf) return createErrorResponse(erroFf.message, 'DELETE_ERROR');
      }

      let leiturasDelete = supabase.from('Leitura').delete().gte('data', de).lt('data', ate);
      if (postoId) leiturasDelete = leiturasDelete.eq('posto_id', postoId);

      const { error: erroLeituras } = await leiturasDelete;
      if (erroLeituras) return createErrorResponse(erroLeituras.message, 'DELETE_ERROR');

      if (ids.length > 0) {
        const { error: erroFech } = await supabase.from('Fechamento').delete().in('id', ids);
        if (erroFech) return createErrorResponse(erroFech.message, 'DELETE_ERROR');
      }

      const depois = await contar(mesIso, postoId);
      const sobrou =
        depois.leituras > 0 ||
        depois.fechamentos > 0 ||
        depois.fechamentosFrentista > 0 ||
        depois.recebimentos > 0;

      return createSuccessResponse({ antes, depois, sobrou });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro ao apagar o mês');
    }
  },
};
