/**
 * A cor do sinal de um número de resultado: verde positivo, vermelho negativo.
 *
 * @remarks Vale **só para número que é saldo** — lucro, margem, perca e sobra.
 *          Faturamento, litro comprado e despesa NÃO passam por aqui: eles não
 *          têm sinal a comunicar, e pintar tudo de verde faria a cor deixar de
 *          significar exatamente onde ela precisa gritar.
 *
 *          Zero fica neutro de propósito: não é ganho nem perda, e verde no zero
 *          leria como lucro que não existiu.
 *
 * @param valor Saldo apurado. `null` quando não há o que apurar.
 * @returns Classe CSS, ou `undefined` para manter a tinta padrão.
 */
export const classeDoSinal = (valor: number | null | undefined): string | undefined => {
    if (valor === null || valor === undefined || valor === 0) return undefined;
    return valor > 0 ? 'pm-num--pos' : 'pm-num--neg';
};

/**
 * A mesma regra do {@link classeDoSinal}, como cor CSS.
 *
 * @remarks Existe para onde a cor entra por `style` e não por classe — o KPI,
 *          que recebe a cor como dado e não como marcação.
 */
export const corDoSinal = (valor: number | null | undefined): string | undefined => {
    if (valor === null || valor === undefined || valor === 0) return undefined;
    return valor > 0 ? 'var(--pos)' : 'var(--neg)';
};

/** Junta classes ignorando as vazias, para não sair `class="a  undefined"`. */
export const classes = (...partes: readonly (string | undefined | false)[]): string =>
    partes.filter(Boolean).join(' ');
