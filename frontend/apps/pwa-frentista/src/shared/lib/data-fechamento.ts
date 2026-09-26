import { Result } from 'neverthrow';
import { hojeIso } from '@posto/utils';

/** `JSON.parse` sem `try`: shared/lib devolve Result (RES-3); o que não parseia vira Err. */
const lerJson = Result.fromThrowable(
  (texto: string): unknown => JSON.parse(texto),
  () => ({ tipo: 'json_invalido' } as const),
);

/**
 * Restaura a data salva SÓ se foi gravada hoje.
 *
 * @param salvo O que está em `localStorage['pwa.dataFechamento']` (ou `null`).
 * @param hoje Dia de referência, `YYYY-MM-DD` local.
 * @returns A data salva, se foi gravada hoje; senão, `hoje`.
 *
 * @remarks A data persiste porque abrir a câmera no celular descarrega a página
 *          (ver `selectedFrentista`). Mas sem validade ela virava armadilha: no
 *          dia seguinte o app abria na data de ontem e o frentista enviava o
 *          caixa de hoje no dia errado sem aviso. Por isso grava-se junto o dia
 *          em que foi salva, e valor de outro dia — ou o formato antigo, string
 *          pura — é descartado em favor de hoje.
 *
 *          Saiu do `App.tsx` no P7b (22/09/2026). Duas diferenças de forma, nenhuma de
 *          comportamento: `if (!salvo)` virou `salvo === null` (o tipo é `string | null`; a
 *          string vazia, que antes caía no `!salvo`, agora falha no `JSON.parse` e cai em
 *          `hoje` do mesmo jeito), e o `try/catch` virou `Result.fromThrowable`, porque
 *          shared/lib não tem `try` (RES-3).
 */
export const dataFechamentoInicial = (salvo: string | null, hoje: string = hojeIso()): string => {
  if (salvo === null) return hoje;
  return lerJson(salvo).match(
    (obj) => {
      if (
        typeof obj === 'object' && obj !== null &&
        'data' in obj && 'gravadoEm' in obj &&
        typeof obj.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.data) &&
        obj.gravadoEm === hoje
      ) {
        return obj.data;
      }
      return hoje;
    },
    // formato antigo (string pura) ou lixo: cai em hoje
    () => hoje,
  );
};
