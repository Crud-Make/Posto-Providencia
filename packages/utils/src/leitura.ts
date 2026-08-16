/**
 * Litros e faturamento de UMA leitura de bico — a aritmética do encerrante.
 *
 * @remarks Existia em dois lugares, com convenções diferentes: o PWA aplicava
 *          `Math.max(0, …)` e o painel (`leitura.service.ts`) não, então a
 *          mesma leitura invertida gravava 0 L por um caminho e litros
 *          NEGATIVOS pelo outro. Como `valor_total` alimenta
 *          `Fechamento.total_vendas` e daí a `diferenca`, a divergência
 *          chegava ao dinheiro conferido do frentista.
 *
 *          Coberto por `leitura.golden.spec.ts` contra as 1.188 leituras reais
 *          de 2026 (`docs/data/posto_jorro_2026.sqlite`), onde bate com as
 *          colunas `litros` e `venda_bico` da própria planilha.
 */

/** Acima disto num turno, é quase certo que caiu ou sobrou um dígito. */
export const MAX_LITROS_PLAUSIVEL = 3000;

export interface LeituraDeBico {
    /** Encerrante no início do período (a `leitura_final` do período anterior). */
    readonly inicial: number;
    /** Encerrante no fim do período. */
    readonly fechamento: number;
}

/** Por que uma leitura não é confiável. `null` = nada a apontar. */
export type MotivoImplausivel = 'retrocedeu' | 'acima-do-teto';

/**
 * Litros vendidos entre duas leituras do mesmo bico.
 *
 * @returns Sempre >= 0. Bomba não anda para trás: quando o encerrante
 *          retrocede é dígito errado, não venda negativa, e deixar o negativo
 *          passar contamina `total_vendas` do dia inteiro em silêncio.
 * @remarks O piso NÃO substitui o aviso — ele evita gravar um número
 *          impossível, e quem apura o aviso é `motivoImplausivel`. Piso sem
 *          aviso apenas troca um erro barulhento por um erro mudo.
 *
 *          Nas 1.188 leituras reais de 2026 o piso nunca dispara (zero linhas
 *          com `fechamento < inicial`), então adotá-lo não altera nenhum
 *          número histórico — está travado no golden.
 */
export const litrosVendidos = ({ inicial, fechamento }: LeituraDeBico): number =>
    Math.max(0, fechamento - inicial);

/**
 * Faturamento bruto de uma leitura, ao preço vigente do combustível.
 *
 * @param precoLitro Preço por litro em reais (a planilha guarda em `valor_lt`).
 */
export const valorDaLeitura = (leitura: LeituraDeBico, precoLitro: number): number =>
    litrosVendidos(leitura) * precoLitro;

/**
 * Aponta por que a leitura é suspeita, para a tela avisar antes de gravar.
 *
 * @returns `null` quando não há o que apontar.
 * @remarks Os dois casos vêm de erro real de digitação/OCR nesta operação:
 *          o encerrante que anda para trás, e o salto grande demais para um
 *          turno. O segundo é o que o piso de zero NÃO pega — um dígito a
 *          menos deixa `fechamento` logo acima de `inicial` e o dia fecha com
 *          venda quase nula sem nada reclamar.
 */
export const motivoImplausivel = (leitura: LeituraDeBico): MotivoImplausivel | null => {
    if (leitura.fechamento < leitura.inicial) return 'retrocedeu';
    if (leitura.fechamento - leitura.inicial > MAX_LITROS_PLAUSIVEL) return 'acima-do-teto';
    return null;
};
