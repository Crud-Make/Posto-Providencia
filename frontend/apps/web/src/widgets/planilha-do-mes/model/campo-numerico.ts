/**
 * Leitura e escrita dos campos numéricos digitáveis da planilha, em pt-BR.
 *
 * @remarks **Vírgula decimal, sem separador de milhar** — e a ausência do milhar
 *          é decisão, não esquecimento.
 *
 *          Numa célula que se digita, `31.000` e `0.473` têm exatamente a mesma
 *          forma: um ponto seguido de três dígitos. Um é trinta e um mil, o
 *          outro é quarenta e sete centésimos. Nenhuma regra distingue os dois
 *          sem adivinhar, e adivinhar aqui já custou caro: o `analisarValor` de
 *          `apps/web/src/utils/formatters.ts` assume os três últimos dígitos
 *          como decimais e **transformou R$ 7.436,00 em R$ 7,44 em produção**.
 *
 *          Tirando o milhar da entrada, a ambiguidade desaparece: o que sobra é
 *          um separador decimal só, e o valor lido é o valor digitado. As
 *          células de **leitura** continuam com o milhar (`formatBR`), onde ele
 *          só ajuda e não pode ser mal interpretado por ninguém.
 */

/**
 * Lê o que foi digitado num campo numérico.
 *
 * @param texto Conteúdo cru do campo. Aceita `"1234,56"`, `"1234.56"` e também
 *              `"1.234,56"` colado de outro lugar.
 * @returns O número, ou `null` quando o campo está vazio ou ilegível — **nunca
 *          zero**. Zero é um valor legítimo (mês sem compra), e devolvê-lo para
 *          campo vazio apagaria a diferença entre "não preenchi" e "foi zero".
 */
export function numeroDoCampo(texto: string | undefined): number | null {
    if (texto === undefined) return null;

    const cru = texto.trim();
    if (cru === '') return null;

    // Com vírgula presente, todo ponto só pode ser milhar — é a única leitura
    // possível, e é o formato que vem colado de planilha.
    const normalizado = cru.includes(',') ? cru.replace(/\./g, '').replace(',', '.') : cru;

    const n = Number(normalizado);
    return Number.isFinite(n) ? n : null;
}

/**
 * Escreve um número no campo, do jeito que se lê em português.
 *
 * @param valor    O número vindo do banco ou de um cálculo.
 * @param casasMax Quantas casas decimais preservar. Litro anda em milésimo
 *                 (3), dinheiro em centavo (2) e o custo do litro em fração de
 *                 centavo (4).
 * @param casasMin Quantas casas **manter mesmo sendo zero**. Padrão `0`, que
 *                 corta os zeros à direita.
 * @returns Texto com vírgula decimal e sem milhar. Por padrão os zeros à direita
 *          saem fora — `7392` em vez de `7392,000`, que é como o dono escreveria
 *          a régua à mão.
 *
 * @remarks `casasMin` existe por causa do **custo do litro**, o único número da
 *          tela em que fração de centavo muda o resultado: ele é multiplicado
 *          pelos litros do mês inteiro. Em janeiro, `0,4730` × 46.843 L dá os
 *          R$ 22.158,46 de despesa; `0,47` daria R$ 22.016,21 — **R$ 142,25 a
 *          menos**. Exibi-lo como `0,473` sugeriria que a quarta casa não existe,
 *          e ela existe.
 */
export function textoDoCampo(valor: number, casasMax = 3, casasMin = 0): string {
    if (!Number.isFinite(valor)) return '';

    const fator = 10 ** casasMax;
    const arredondado = Math.round(valor * fator) / fator;

    const texto =
        casasMin > 0 ? arredondado.toFixed(Math.max(casasMin, 0)) : String(arredondado);

    return texto.replace('.', ',');
}
