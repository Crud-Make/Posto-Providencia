import { supabase } from '../supabase';
import {
  fixasPendentes,
  deIsoLocal,
  ultimoDiaDoMes,
  type FixaPendente,
} from '@posto/utils';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse,
} from '../../types/ui/response-types';

/**
 * Acesso a dados das DESPESAS FIXAS (recorrentes).
 *
 * @remarks
 * Arquivo separado de `despesa.service.ts` por um motivo concreto, não estético:
 * juntas, as consultas daqui e as de lá estouram o orçamento de instanciação de
 * tipos do TypeScript no mesmo arquivo — `Type instantiation is excessively deep`
 * (TS2589). O `getAll` de lá é idêntico em forma e compila; o que quebra é o
 * acúmulo. Separar resolveu sem precisar de um único `any` ou `@ts-expect-error`
 * num caminho que decide dinheiro.
 *
 * A REGRA de negócio não mora aqui: `fixasPendentes` é função pura em
 * `@posto/utils/despesa-fixa`, testada isoladamente. Este módulo só busca e grava.
 *
 * @module services/api/despesa-fixa
 */

/** Um lançamento revisado pelo dono, pronto para gravar. */
export interface LancamentoFixa {
  readonly descricao: string;
  readonly categoria: string | null;
  /** Valor CONFIRMADO pelo dono, não o sugerido. */
  readonly valor: number;
  readonly categoriaId?: number | null;
}

export const despesaFixaService = {
  /**
   * Despesas fixas que ainda faltam num mês, com o valor sugerido.
   *
   * @param mesAlvo - Mês em ISO local `aaaa-mm`.
   *
   * @remarks Traz todas as recorrentes (de qualquer mês) e as já lançadas no mês
   *          alvo, e deixa a decisão para `fixasPendentes`. A sugestão é sempre o
   *          lançamento mais recente — é assim que o reajuste de salário chega
   *          sozinho ao mês novo.
   */
  async pendentesDoMes(mesAlvo: string, postoId: number): Promise<ApiResponse<FixaPendente[]>> {
    try {
      const ultimoDia = ultimoDiaDoMes(deIsoLocal(`${mesAlvo}-01`));

      const recorrentes = await supabase
        .from('Despesa')
        .select('*')
        .eq('posto_id', postoId)
        .eq('recorrente', true);
      if (recorrentes.error) return createErrorResponse(recorrentes.error.message, 'FETCH_ERROR');

      const doMes = await supabase
        .from('Despesa')
        .select('*')
        .eq('posto_id', postoId)
        .gte('data', `${mesAlvo}-01`)
        .lte('data', ultimoDia);
      if (doMes.error) return createErrorResponse(doMes.error.message, 'FETCH_ERROR');

      return createSuccessResponse(
        fixasPendentes(
          (recorrentes.data ?? []).map((d) => ({
            descricao: d.descricao,
            categoria: d.categoria,
            valor: Number(d.valor),
            data: String(d.data).slice(0, 10),
            categoriaId: d.categoria_id,
          })),
          (doMes.data ?? []).map((d) => d.descricao),
          mesAlvo
        )
      );
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Lança de uma vez as fixas revisadas pelo dono.
   *
   * @param data - Data do lançamento, ISO local `aaaa-mm-dd`.
   *
   * @remarks Entram como `recorrente: true`, para continuarem servindo de molde no
   *          mês seguinte, e como **`pendente`**: quem lança em bloco no começo do
   *          mês ainda não pagou. Marcar `pago` aqui encheria o "Total pendente" de
   *          mentira e daria por quitado o que não foi.
   */
  async lancar(
    lancamentos: readonly LancamentoFixa[],
    data: string,
    postoId: number
  ): Promise<ApiResponse<number>> {
    if (lancamentos.length === 0) return createSuccessResponse(0);

    try {
      const linhas = lancamentos.map((l) => ({
        descricao: l.descricao,
        categoria: l.categoria,
        categoria_id: l.categoriaId ?? null,
        valor: l.valor,
        data,
        // `as const` porque o tipo do banco restringe a união 'pendente' | 'pago';
        // sem isso o literal alarga para `string` e a atribuição falha.
        status: 'pendente' as const,
        recorrente: true,
        posto_id: postoId,
      }));

      const { error } = await supabase.from('Despesa').insert(linhas);
      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');

      return createSuccessResponse(linhas.length);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /** Marca ou desmarca uma despesa como fixa. */
  async marcarComoFixa(id: number, recorrente: boolean): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase.from('Despesa').update({ recorrente }).eq('id', id);
      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};
