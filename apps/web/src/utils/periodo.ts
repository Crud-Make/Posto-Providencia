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
import { deIsoLocal, paraMesLocal, ultimoDiaDoMes } from '@posto/utils';

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

/**
 * Intervalo de consulta de um mês, em ISO local.
 *
 * @param mesIso - Mês desejado, `aaaa-mm`.
 * @param hoje - Hoje em ISO local (`hojeIso()`), injetado para o cálculo ser puro.
 * @returns `inicio` no dia 1; `fim` no último dia do mês, **ou em `hoje`** quando o mês
 *          pedido é o corrente.
 *
 * @remarks O corte em `hoje` no mês corrente não é detalhe: incluir dias futuros não muda
 *          a soma (não há venda neles), mas faz o rateio de despesa por litro e a média
 *          diária mentirem para baixo — o mês inteiro de despesa dividido por uma fração
 *          dos litros. Em mês passado o intervalo é o mês fechado.
 */
export function intervaloDoMes(mesIso: string, hoje: string): Periodo {
  const inicio = `${mesIso}-01`;
  const ultimoDia = ultimoDiaDoMes(deIsoLocal(inicio));
  const ehMesCorrente = inicio <= hoje && hoje <= ultimoDia;
  return { inicio, fim: ehMesCorrente ? hoje : ultimoDia };
}

/** `true` quando `mesIso` (`aaaa-mm`) é o mês em que `hoje` cai. */
export function ehMesCorrente(mesIso: string, hoje: string): boolean {
  return mesIso === hoje.slice(0, 7);
}

/**
 * Últimos `quantidade` meses até o mês de `hoje`, do mais recente para o mais antigo.
 *
 * @returns ISO local `aaaa-mm`.
 */
export function mesesRecentes(hoje: string, quantidade: number): string[] {
  const base = deIsoLocal(`${hoje.slice(0, 7)}-01`);
  return Array.from({ length: quantidade }, (_, i) =>
    paraMesLocal(new Date(base.getFullYear(), base.getMonth() - i, 1))
  );
}

/** Rótulo de mês para exibição: `2026-01` → `Janeiro/2026`. */
export function formatarMesBR(mesIso: string): string {
  const NOMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const [ano, mes] = mesIso.split('-');
  return `${NOMES[Number(mes) - 1]}/${ano}`;
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
