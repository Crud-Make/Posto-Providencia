/**
 * Serviço de Presença dos Frentistas
 *
 * @remarks
 * Lê o último sinal de vida que cada PWA mandou. Quem escreve é o app do
 * frentista (`apps/pwa-frentista`); o painel só lê.
 *
 * A tradução snake_case → camelCase acontece aqui, na fronteira, como manda o
 * Data Mapper (CLAUDE.md §4): daqui pra dentro do painel o tipo é
 * `PresencaFrentista` de `@posto/utils`, e a classificação online/ausente é
 * decidida lá, não aqui.
 */

import { supabase, withPostoFilter } from './base.ts';
import type { PresencaFrentista } from '@posto/utils';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

/** Linha crua devolvida pelo join com `Frentista`. */
interface LinhaPresenca {
  frentista_id: number;
  visto_em: string;
  frentista: { nome: string } | null;
}

export const presencaService = {
  /**
   * Último sinal de vida de cada frentista.
   *
   * @param postoId - ID do posto (opcional)
   *
   * @remarks
   * Devolve **tudo** que está na tabela, sem recorte de tempo: quem some da
   * lista e quem aparece como online é decisão de `presencasRelevantes` e
   * `statusPresenca` (`@posto/utils/presenca`), que são puras e testadas.
   * Filtrar por tempo aqui esconderia a régua dentro de uma query.
   *
   * A tabela tem no máximo uma linha por frentista (8 hoje) — não vale paginar.
   */
  async getAll(postoId?: number): Promise<ApiResponse<PresencaFrentista[]>> {
    try {
      const baseQuery = supabase
        .from('PresencaFrentista')
        .select('frentista_id, visto_em, frentista:Frentista(nome)');

      const { data, error } = await withPostoFilter(baseQuery, postoId);
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      // O cliente infere o join como array; a FK é many-to-one e em runtime vem objeto.
      const linhas = (data ?? []) as unknown as LinhaPresenca[];

      const presencas: PresencaFrentista[] = linhas.map(l => ({
        frentistaId: l.frentista_id,
        nome: l.frentista?.nome ?? 'Frentista',
        vistoEm: new Date(l.visto_em),
      }));

      return createSuccessResponse(presencas);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};
