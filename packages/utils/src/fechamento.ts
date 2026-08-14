/**
 * Aritmética canônica do Fechamento (soma dos meios de pagamento, diferença de caixa).
 *
 * @remarks
 * Módulo profundo e puro: uma única definição de `conferido`, `diferenca` e `cartao`,
 * consumida por PWA, web e serviços via adapters nas bordas. Tudo em REAIS (`number`).
 *
 * Decisões de domínio fixadas aqui (ver regras-negocio.md):
 * - `conferido` inclui os 7 buckets: dinheiro, moedas, pix, cartão, nota, baratão.
 * - `cartao` é ADITIVO: valor_cartao (lump lançado no web) + débito + crédito (split do PWA).
 *   Web-lump e PWA-split nunca coexistem na mesma linha, então somar não dupla-conta.
 * - `diferenca = encerrante − conferido`; positivo = FALTA, negativo = SOBRA.
 *
 * @module @posto/utils/fechamento
 */

/**
 * Meios de pagamento de uma sessão de frentista, normalizados em reais.
 *
 * @remarks
 * Value object neutro: não conhece o schema do banco nem o formato de nenhuma UI.
 * Construa-o a partir de uma origem concreta com os adapters `meiosFromFechamentoRow`
 * (linha numérica do banco / UI já parseada) ou `meiosFromPwaPayments` (PWA, centavos).
 */
export interface MeiosPagamento {
    dinheiro: number;
    moedas: number;
    pix: number;
    cartaoDebito: number;
    cartaoCredito: number;
    /** Lump de cartão lançado no dashboard web (coluna `valor_cartao`). */
    cartaoLegado: number;
    nota: number;
    baratao: number;
}

/** Coerção segura para número finito em reais (null/undefined/NaN → 0). */
const num = (v: unknown): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0;

/**
 * Quantiza um valor em reais para centavos inteiros e volta.
 *
 * @remarks
 * Skill fechamento-posto-providencia: dinheiro deve ser operado como inteiro
 * (centavos) para não acumular erro de ponto flutuante. As funções agregadas
 * desescalam só no retorno, garantindo precisão de centavo.
 */
const emCentavos = (reais: number): number => Math.round(reais * 100) / 100;

/**
 * Total de cartão de uma sessão (ADITIVO), em precisão de centavos.
 *
 * @returns `cartaoLegado + cartaoDebito + cartaoCredito`
 */
export function cartao(m: MeiosPagamento): number {
    return emCentavos(m.cartaoLegado + m.cartaoDebito + m.cartaoCredito);
}

/**
 * Valor conferido: soma de todos os meios de pagamento declarados (os 7 buckets),
 * em precisão de centavos.
 *
 * @returns `dinheiro + moedas + pix + cartao(m) + nota + baratao`
 */
export function conferido(m: MeiosPagamento): number {
    return emCentavos(
        m.dinheiro + m.moedas + m.pix + cartao(m) + m.nota + m.baratao
    );
}

/**
 * Diferença de caixa entre o encerrante e o valor conferido, em precisão de centavos.
 *
 * @param encerrante - Valor do encerrante (total do relatório de fechamento).
 * @param valorConferido - Soma dos meios declarados (ver {@link conferido}).
 * @returns `encerrante − valorConferido`. Positivo = FALTA, negativo = SOBRA.
 */
export function diferenca(encerrante: number, valorConferido: number): number {
    return emCentavos(encerrante - valorConferido);
}

/** `true` quando a diferença representa falta de caixa (encerrante > conferido). */
export function isFalta(diferencaValor: number): boolean {
    return diferencaValor > 0;
}

/** `true` quando a diferença representa sobra de caixa (conferido > encerrante). */
export function isSobra(diferencaValor: number): boolean {
    return diferencaValor < 0;
}

/**
 * Recupera o valor conferido a partir do que está gravado numa linha agregada de
 * `Fechamento`, que guarda `total_vendas` e `diferenca` mas não o conferido.
 *
 * @param encerrante - `total_vendas` da linha (venda do concentrador).
 * @param diferencaGravada - coluna `diferenca` da mesma linha.
 * @returns `encerrante − diferencaGravada`, em precisão de centavos.
 * @remarks Álgebra exata, não estimativa: é a inversa de {@link diferenca}.
 *          Conferida contra produção em 13/08/2026 — nas 12 linhas de maior
 *          |diferença| do histórico, `diferenca` gravada é idêntica a
 *          `total_vendas − soma dos meios dos filhos`, ao centavo.
 */
export function conferidoImplicito(encerrante: number, diferencaGravada: number): number {
    return emCentavos(encerrante - diferencaGravada);
}

/**
 * `true` quando o fechamento registrou venda mas **nenhum** meio de pagamento.
 *
 * @param encerrante - `total_vendas` da linha.
 * @param diferencaGravada - coluna `diferenca` da mesma linha.
 * @param toleranciaEmReais - folga para ruído de centavo. Padrão: R$ 0,05.
 * @returns `true` se houve venda e o conferido implícito é ~zero.
 *
 * @remarks
 * Existe para substituir uma heurística que vivia em
 * `apps/web/.../useRelatorioDiario.ts` e **zerava a diferença de caixa na tela**
 * quando `|diferenca + total_vendas| < 5`. Duas coisas estavam erradas ali:
 *
 * 1. **O sinal.** Com `diferenca = encerrante − conferido` (§6, e confirmado no
 *    dado real), "nada lançado" dá `diferenca = +total_vendas`, então a condição
 *    testava `|2 × total_vendas| < 5` — impossível com venda acima de R$ 100.
 *    Medido: **0 de 201** fechamentos do histórico a satisfaziam, e o caso que
 *    ela dizia cobrir (`conferido = 0`) nunca ocorreu em 213 fechamentos. Ela
 *    só dispararia com `conferido ≈ 2 × encerrante` — lançamento em dobro, o
 *    oposto do que o comentário afirmava.
 * 2. **Zerar o número.** Mesmo com o sinal certo, apagar a diferença esconde
 *    exatamente o que o sistema existe para acusar. Aqui a pergunta é só de
 *    *estado* — quem chama decide como sinalizar, e nenhum valor é reescrito.
 */
export function semLancamento(
    encerrante: number,
    diferencaGravada: number,
    toleranciaEmReais = 0.05
): boolean {
    return (
        encerrante > 0 &&
        Math.abs(conferidoImplicito(encerrante, diferencaGravada)) <= toleranciaEmReais
    );
}

/**
 * Detalhamento por meio de pagamento + total conferido.
 *
 * @remarks
 * Substitui as reimplementações inline de `distribuicaoPagamentos` / `totais`.
 * `cartao` já vem consolidado (aditivo); `total` é igual a {@link conferido}.
 */
export interface BreakdownPagamentos {
    dinheiro: number;
    moedas: number;
    pix: number;
    cartao: number;
    nota: number;
    baratao: number;
    total: number;
}

/** Quebra uma sessão em cada bucket + total (ver {@link BreakdownPagamentos}). */
export function breakdown(m: MeiosPagamento): BreakdownPagamentos {
    return {
        dinheiro: m.dinheiro,
        moedas: m.moedas,
        pix: m.pix,
        cartao: cartao(m),
        nota: m.nota,
        baratao: m.baratao,
        total: conferido(m),
    };
}

/**
 * Campos numéricos (reais) de uma linha `FechamentoFrentista` do banco — ou de uma
 * `SessaoFrentista` da UI já parseada para número. Tolerante a ausências e a `null`.
 *
 * @remarks
 * Aceita tanto `baratao` (nome da coluna no banco) quanto `valor_baratao` (nome no
 * tipo de UI). `valor_moedas` pode faltar (UI web não coleta moedas) → 0.
 */
export interface FechamentoRowNumerico {
    valor_dinheiro?: number | null;
    valor_moedas?: number | null;
    valor_pix?: number | null;
    valor_cartao?: number | null;
    valor_cartao_debito?: number | null;
    valor_cartao_credito?: number | null;
    valor_nota?: number | null;
    baratao?: number | null;
    valor_baratao?: number | null;
}

/**
 * Adapter: constrói {@link MeiosPagamento} a partir de uma linha numérica do banco
 * (`FechamentoFrentista`) ou de uma `SessaoFrentista` já convertida para número.
 *
 * @example
 * conferido(meiosFromFechamentoRow(row)); // total canônico da linha
 */
export function meiosFromFechamentoRow(row: FechamentoRowNumerico): MeiosPagamento {
    return {
        dinheiro: num(row.valor_dinheiro),
        moedas: num(row.valor_moedas),
        pix: num(row.valor_pix),
        cartaoDebito: num(row.valor_cartao_debito),
        cartaoCredito: num(row.valor_cartao_credito),
        cartaoLegado: num(row.valor_cartao),
        nota: num(row.valor_nota),
        baratao: num(row.baratao ?? row.valor_baratao),
    };
}

/**
 * Objeto de pagamentos do PWA: strings de moeda mascarada, em CENTAVOS
 * (ex.: "R$ 12,34" ou "1234"). Origem: `apps/pwa-frentista` estado `payments`.
 */
export interface PwaPayments {
    dinheiro: string;
    moedas: string;
    pix: string;
    debito: string;
    credito: string;
    notaPrazo: string;
    baratao: string;
}

/** Converte uma string mascarada em centavos para reais (dígitos / 100). */
const centavosParaReais = (v: string | undefined): number =>
    (parseInt((v ?? '').replace(/\D/g, ''), 10) || 0) / 100;

/**
 * Adapter: constrói {@link MeiosPagamento} a partir do objeto `payments` do PWA
 * (strings em centavos). O PWA não usa `valor_cartao` legado → `cartaoLegado = 0`.
 */
export function meiosFromPwaPayments(payments: PwaPayments): MeiosPagamento {
    return {
        dinheiro: centavosParaReais(payments.dinheiro),
        moedas: centavosParaReais(payments.moedas),
        pix: centavosParaReais(payments.pix),
        cartaoDebito: centavosParaReais(payments.debito),
        cartaoCredito: centavosParaReais(payments.credito),
        cartaoLegado: 0,
        nota: centavosParaReais(payments.notaPrazo),
        baratao: centavosParaReais(payments.baratao),
    };
}
