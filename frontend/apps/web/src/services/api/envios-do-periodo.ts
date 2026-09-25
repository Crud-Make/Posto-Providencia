import { conferido, emCentavos, meiosFromFechamentoRow } from '@posto/utils';
import type { FechamentoFrentista } from '../../types/database/index';
import type { SessaoDoDia } from './fechamentoFrentista.api';

/**
 * Os envios de cada frentista no período, para a tabela de fechamentos do Dashboard.
 *
 * @remarks Até 24/09/2026 a tabela lia só o primeiro dia do período e guardava UM envio por
 *          frentista, enquanto os cards de cima somavam o período inteiro. Agora:
 *          - dentro de um mesmo dia (mesmo `fechamento_id`) vale o ÚLTIMO envio, exatamente como
 *            antes — um envio em dobro não conta duas vezes;
 *          - entre dias, os envios somam: total conferido e diferença do período, em centavos.
 *          "Conferido" só quando TODOS os envios do período levam a marca `[CONFERIDO]` do painel.
 *          Nenhuma fórmula nova: o conferido de cada envio é o canônico (`conferido`), e a soma é
 *          quantizada por `emCentavos`.
 */
export interface EnviosDoFrentista {
  readonly totalConferido: number;
  /** Soma com sinal de `diferenca_calculada` (concentrador − conferido): positivo é falta. */
  readonly diferenca: number;
  readonly conferido: boolean;
}

type Envio = FechamentoFrentista | SessaoDoDia;

export function enviosPorFrentista(envios: readonly Envio[]): Map<number, EnviosDoFrentista> {
  const ultimoPorDia = new Map<string, Envio>();
  for (const envio of envios) {
    ultimoPorDia.set(`${envio.frentista_id}:${envio.fechamento_id}`, envio);
  }

  const resumo = new Map<number, EnviosDoFrentista>();
  for (const envio of ultimoPorDia.values()) {
    const anterior = resumo.get(envio.frentista_id);
    resumo.set(envio.frentista_id, {
      totalConferido: emCentavos((anterior?.totalConferido ?? 0) + conferido(meiosFromFechamentoRow(envio))),
      diferenca: emCentavos((anterior?.diferenca ?? 0) + (envio.diferenca_calculada ?? 0)),
      conferido: (anterior?.conferido ?? true) && (envio.observacoes?.includes('[CONFERIDO]') ?? false),
    });
  }
  return resumo;
}
