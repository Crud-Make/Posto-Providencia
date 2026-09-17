/**
 * Calendário único do sistema (§2 — API pública da fatia).
 *
 * @example Um dia
 * ```tsx
 * <Calendario modo={modoDia} valor={data} aoMudar={setData} maximo={hojeIso()} />
 * ```
 * @example Um mês
 * ```tsx
 * <Calendario modo={modoMes} valor={mes} aoMudar={setMes} prefixo="Período" />
 * ```
 * @example Um intervalo
 * ```tsx
 * <Calendario modo={modoIntervalo} valor={periodo} aoMudar={setPeriodo} />
 * ```
 */
export { default as Calendario } from './calendario';
export { modoDia, modoMes, modoIntervalo } from './modos';
export type { ModoCalendario, Selecao } from './modos';
export type { TomCalendario, NomeTom } from './tons';
