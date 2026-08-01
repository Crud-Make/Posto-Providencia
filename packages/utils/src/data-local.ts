/**
 * Data de calendário em ISO **local** — nunca via `toISOString()`.
 *
 * @remarks
 * O posto está em GMT-3. `new Date().toISOString()` devolve o instante em UTC, então a
 * partir das **21h locais** a parte da data já é o **dia seguinte**:
 *
 * ```
 * // 31/07/2026, 21:37 em Salvador
 * new Date().toISOString().split('T')[0]  // '2026-08-01'  ← amanhã
 * hojeIso()                               // '2026-07-31'  ← hoje
 * ```
 *
 * Isso não é teoria: em 31/07/2026 o painel do proprietário **apagava inteiro todas as
 * noites**, das 21h à meia-noite. As duas abas consultavam o dia seguinte — que não tem
 * dado — porque o início do mês era derivado do mesmo valor e saltava junto para o mês novo.
 *
 * O espelho do mesmo erro está na LEITURA: `new Date('2026-07-31')` é parseado como
 * meia-noite **UTC**, que em GMT-3 é 21h do dia **30**. Daí `.getDate()` devolver 30.
 * Use {@link deIsoLocal} para ler, {@link paraIsoLocal} para escrever.
 *
 * Uma regra de lint (`no-restricted-syntax` em `eslint.config.mjs`) barra o padrão errado
 * no CI — instrução é forte, portão automático é garantia.
 *
 * @module @posto/utils/data-local
 */

/**
 * Converte um `Date` para ISO local `aaaa-mm-dd`, sem passar pelo UTC.
 *
 * @example paraIsoLocal(new Date(2026, 6, 31)) // '2026-07-31'
 */
export function paraIsoLocal(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

/**
 * Converte um `Date` para o mês local `aaaa-mm`.
 *
 * @remarks Existe para substituir `toISOString().slice(0, 7)`, que na virada da noite
 *          pula o mês inteiro — em 31/07 às 21h devolvia `2026-08`.
 */
export function paraMesLocal(data: Date): string {
    return paraIsoLocal(data).slice(0, 7);
}

/**
 * Lê um ISO local `aaaa-mm-dd` como data local.
 *
 * @remarks `new Date('2026-07-31')` trataria a string como UTC e devolveria 21h do dia 30
 *          em GMT-3 — qualquer `getDate()`/`getDay()` depois disso sai deslocado um dia.
 */
export function deIsoLocal(iso: string): Date {
    const [ano, mes, dia] = iso.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
}

/** Data de hoje em ISO local `aaaa-mm-dd`. */
export function hojeIso(): string {
    return paraIsoLocal(new Date());
}

/** Mês corrente em ISO local `aaaa-mm`. */
export function mesAtualIso(): string {
    return paraMesLocal(new Date());
}

/** Primeiro dia do mês de `data`, em ISO local. */
export function primeiroDiaDoMes(data: Date = new Date()): string {
    return paraIsoLocal(new Date(data.getFullYear(), data.getMonth(), 1));
}

/** Último dia do mês de `data`, em ISO local. */
export function ultimoDiaDoMes(data: Date = new Date()): string {
    return paraIsoLocal(new Date(data.getFullYear(), data.getMonth() + 1, 0));
}

/** `data` deslocada de `dias` (negativo para trás), em ISO local. */
export function somarDias(data: Date, dias: number): string {
    const d = new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
    return paraIsoLocal(d);
}
