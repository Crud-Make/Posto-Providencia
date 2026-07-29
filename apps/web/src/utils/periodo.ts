/**
 * Período de datas dos filtros de tela e conversões ISO local.
 *
 * @remarks
 * Tudo aqui trabalha com ISO **local** (`aaaa-mm-dd`) e nunca com `toISOString()`:
 * o posto está em GMT-3, então `new Date().toISOString()` devolve o dia seguinte a partir
 * das 21h local — um filtro montado assim pula um dia à noite.
 */

/** Período selecionado, em ISO local `aaaa-mm-dd`. */
export interface Periodo {
  readonly inicio: string;
  readonly fim: string;
}

/** Converte um `Date` para ISO local `aaaa-mm-dd`, sem passar pelo UTC. */
export function paraIsoLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** Lê um ISO local `aaaa-mm-dd` como data local (o construtor com string trataria como UTC). */
export function deIsoLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Data de hoje em ISO local. */
export function hojeIso(): string {
  return paraIsoLocal(new Date());
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
