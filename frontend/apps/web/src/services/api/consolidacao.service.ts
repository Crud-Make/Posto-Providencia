/**
 * Reconsolida o `Fechamento` pai de um dia — a mesma conta do PWA, chamada pelo painel.
 *
 * @remarks
 * Até 04/09/2026 só o PWA do frentista (a cada filho enviado) e o app do dono (ao salvar
 * a foto) reconsolidavam o pai. O painel gravava `Leitura` e não avisava ninguém: o
 * dono digitava os 6 bicos e `total_vendas`/`diferenca` ficavam no zero de nascimento
 * para sempre. Este módulo é a porta única do painel para `consolidarFechamento`
 * (`@posto/api-core`), e serve também ao script `scripts/reconsolidar-dia.ts` para dado
 * que entrou por SQL.
 */
import { criarAcessoEncerrante, type ConsolidacaoDoDia } from '@posto/api-core';
import { supabase } from '../supabase';
import { fechamentoService } from './fechamento.service';
import { isSuccess } from '../../types/ui/response-types';

const acesso = criarAcessoEncerrante(supabase);

/** Resultado de {@link reconsolidarDia}. */
export type ResultadoReconsolidacao =
  /** Nenhum frentista abriu o dia ainda: sem pai, nada a consolidar — o primeiro envio do PWA fará. */
  | { readonly situacao: 'sem-pai' }
  /** O pai existe e a consolidação rodou (ver `apurado`). */
  | { readonly situacao: 'ok'; readonly totais: ConsolidacaoDoDia }
  /** A consolidação falhou (erro já no console) — o pai ficou como estava. */
  | { readonly situacao: 'falhou' };

/**
 * Acha o pai do dia (por posto + data, sem turno) e reconsolida a partir do banco.
 */
export async function reconsolidarDia(postoId: number, dataIso: string): Promise<ResultadoReconsolidacao> {
  const pai = await fechamentoService.getDoDia(dataIso, postoId);
  if (!isSuccess(pai) || !pai.data) return { situacao: 'sem-pai' };

  const totais = await acesso.consolidarFechamento(pai.data.id);
  return totais ? { situacao: 'ok', totais } : { situacao: 'falhou' };
}
