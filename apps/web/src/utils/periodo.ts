/**
 * Período de datas dos filtros de tela.
 *
 * @remarks
 * [31/07] As primitivas de data local mudaram-se para `@posto/utils/data-local`: o
 * `pwa-frentista` sofria do mesmo bug de fuso e não pode importar de `apps/web` (§2).
 * Este módulo passa a reexportá-las e fica com o que é de apresentação.
 *
 * Tudo aqui trabalha com ISO **local** (`aaaa-mm-dd`) e nunca com `toISOString()`:
 * o posto está em GMT-3, então `new Date().toISOString()` devolve o dia seguinte a partir
 * das 21h local — um filtro montado assim pula um dia à noite.
 */
import { deIsoLocal } from '@posto/utils';

export {
  paraIsoLocal,
  paraMesLocal,
  deIsoLocal,
  hojeIso,
  mesAtualIso,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
  somarDias,
} from '@posto/utils';

/** Período selecionado, em ISO local `aaaa-mm-dd`. */
export interface Periodo {
  readonly inicio: string;
  readonly fim: string;
}

/** Formata um ISO local como `dd/mm/aaaa`. */
export function formatarDataBR(iso: string): string {
  const d = deIsoLocal(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Rótulo do período: um dia só (`29/07/2026`) ou intervalo (`01/07 – 29/07/2026`).
 * No intervalo dentro do mesmo ano, o ano aparece só no fim, pra não estourar o botão.
 */
export function formatarPeriodo({ inicio, fim }: Periodo): string {
  if (inicio === fim) return formatarDataBR(inicio);
  const mesmoAno = inicio.slice(0, 4) === fim.slice(0, 4);
  const de = mesmoAno ? formatarDataBR(inicio).slice(0, 5) : formatarDataBR(inicio);
  return `${de} – ${formatarDataBR(fim)}`;
}
