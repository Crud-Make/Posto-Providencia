/**
 * Impacto da troca de preço de venda no meio do mês (Issue #61).
 *
 * @remarks
 * Módulo puro, sem I/O. Responde três perguntas, cada uma numa função:
 *
 * 1. **Quando o preço trocou?** — {@link trocasDePreco}: varre as leituras
 *    diárias por combustível e devolve cada transição (dia, preço antigo,
 *    preço novo). Coberto por golden master contra `encerrante_diario` de
 *    `docs/data/posto_jorro_2026.sqlite` (janeiro: 4 trocas em 07/01; maio e
 *    junho como segundo caso).
 * 2. **Quanto havia no tanque na véspera?** — {@link estoqueNaVespera}: a
 *    mesma corrente do estoque derivado (régua + compras − vendas desde a
 *    régua), cortada no dia ANTERIOR à troca. Delega a soma a
 *    {@link resumoEstoque} — a fórmula mora lá, não aqui.
 * 3. **Quanto se ganhou/perdeu?** — {@link impactoTrocaDePreco}:
 *    `ganhoPerdaCentavos = litrosNoTanque × (precoNovo − precoAntigo)`.
 *    O CUSTO NÃO ENTRA nessa conta: vendido ao preço novo vs. ao preço
 *    antigo, a diferença é só o Δpreço sobre os litros parados. O custo médio
 *    do mês vai junto como CONTEXTO (a margem da época), calculado por
 *    {@link custoMedioCompra} — a mesma média que a planilha (`media_lt`) e a
 *    RPC `get_dashboard_proprietario` usam.
 * 4. **O que a troca fez com a margem e com o estoque?** (Issue #70) —
 *    `margemAntigaLitro`/`margemNovaLitro` (margem BRUTA por litro: preço −
 *    custo médio do mês; a despesa operacional NÃO entra — a margem completa
 *    dependeria da `Despesa`, hoje refém do replay) e
 *    `valorEstoqueAntigoCentavos`/`valorEstoqueNovoCentavos` (valor de venda
 *    dos litros parados a cada preço). {@link resumoPorDirecao} agrega o mês
 *    em subidas × descidas. Margens cobertas por golden (preço e `media_lt`
 *    vêm ambos da planilha); valorização é aritmética coberta por unitário.
 *
 * A planilha não tem referência diária de tanque nem data por carga, então o
 * golden cobre a DETECÇÃO e a ARITMÉTICA; `litrosNoTanque` é derivado do
 * banco e é coberto por teste unitário, não por golden.
 *
 * @module @posto/utils/troca-preco
 */
import { resumoEstoque } from './resumo-estoque';
import { custoMedioCompra } from './lucro';

/** Uma linha de leitura diária (por bico ou já agregada) com o preço do dia. */
export interface LeituraPrecoDia {
    /** Dia em ISO local (`YYYY-MM-DD`). */
    readonly data: string;
    /** Chave do combustível (id ou rótulo canônico — só precisa ser estável). */
    readonly combustivel: string;
    /** Preço de venda por litro em reais. `null` = a fonte não registrou. */
    readonly precoLitro: number | null;
    /** Litros vendidos no dia por esta linha. */
    readonly litrosVendidos: number;
}

/** Uma carga comprada, com data — vem de `Compra`. */
export interface CompraComData {
    readonly combustivel: string;
    /** Dia em ISO local (`YYYY-MM-DD`). */
    readonly data: string;
    readonly litros: number;
    readonly valorTotal: number;
}

/** Uma medição física de régua — vem de `HistoricoTanque`. */
export interface ReguaComData {
    readonly combustivel: string;
    /** Dia em ISO local (`YYYY-MM-DD`). */
    readonly data: string;
    readonly litros: number;
}

/** Uma transição de preço detectada. */
export interface TrocaDePreco {
    /** Primeiro dia com o preço NOVO. */
    readonly data: string;
    readonly combustivel: string;
    readonly precoAntigo: number;
    readonly precoNovo: number;
}

/** Direção de uma troca de preço. Union de string, sem `enum` (§4 do CLAUDE.md). */
export const DIRECAO_TROCA = ['subida', 'descida'] as const;
export type DirecaoTroca = (typeof DIRECAO_TROCA)[number];

/** Uma troca com o impacto sobre o estoque parado e sobre a margem. */
export interface ImpactoTroca extends TrocaDePreco {
    /** `'subida'` quando o preço subiu (`precoNovo > precoAntigo`); senão `'descida'`. */
    readonly direcao: DirecaoTroca;
    /**
     * Litros no tanque no fim da véspera da troca.
     * `null` = sem régua anterior à troca; sem régua não há estoque apurável.
     */
    readonly litrosNoTanque: number | null;
    /**
     * Custo médio de compra do MÊS da troca (reais/L), só como contexto.
     * `null` = mês sem compra. NÃO entra em `ganhoPerdaCentavos`.
     */
    readonly custoMedioLitro: number | null;
    /**
     * Margem BRUTA por litro ao preço ANTIGO: `precoAntigo − custoMedioLitro`,
     * em R$/L. Não é dinheiro final → precisão total, sem quantizar (mesma
     * regra de `custoMedioLitro`). A despesa operacional NÃO entra — decisão
     * da Issue #70. `null` quando o mês não tem compra.
     */
    readonly margemAntigaLitro: number | null;
    /** Margem bruta por litro ao preço NOVO: `precoNovo − custoMedioLitro`. `null` sem compra no mês. */
    readonly margemNovaLitro: number | null;
    /**
     * Valor de venda do estoque parado AO PREÇO ANTIGO:
     * `litrosNoTanque × precoAntigo`, em CENTAVOS inteiros.
     * `null` quando `litrosNoTanque` é `null`.
     */
    readonly valorEstoqueAntigoCentavos: number | null;
    /**
     * Valor de venda do estoque parado ao preço NOVO. Derivado como
     * `valorEstoqueAntigoCentavos + ganhoPerdaCentavos` — e não arredondando
     * `litros × precoNovo` à parte — para que a diferença exibida FECHE SEMPRE
     * com o ganho/perda (dois arredondamentos independentes poderiam divergir
     * 1 centavo na tela). `null` quando não apurável.
     */
    readonly valorEstoqueNovoCentavos: number | null;
    /**
     * `litrosNoTanque × (precoNovo − precoAntigo)`, em CENTAVOS inteiros.
     * Positivo = os litros parados renderam mais ao preço novo; negativo =
     * renderam menos (preço caiu sobre estoque já comprado).
     * `null` quando `litrosNoTanque` é `null`.
     */
    readonly ganhoPerdaCentavos: number | null;
}

/**
 * Preço dominante de um dia: o da linha com mais litros vendidos.
 *
 * @remarks Bicos do mesmo combustível quase sempre compartilham o preço (é o
 *          caso de janeiro inteiro). Quando divergem no mesmo dia, o que
 *          vendeu mais define o preço "do dia" — determinístico e à prova do
 *          Bico 06, cujo `valor_lt` é nulo o mês todo na planilha.
 */
function precoDominanteDoDia(linhas: readonly LeituraPrecoDia[]): number | null {
    let melhor: LeituraPrecoDia | null = null;
    for (const l of linhas) {
        if (l.precoLitro == null) continue;
        if (melhor === null || l.litrosVendidos > melhor.litrosVendidos) melhor = l;
    }
    return melhor?.precoLitro ?? null;
}

/**
 * Detecta as trocas de preço de venda, por combustível.
 *
 * Dia sem preço registrado não quebra a corrente: compara-se sempre o último
 * preço CONHECIDO com o próximo conhecido — "não anotei" não é troca.
 *
 * @returns Trocas ordenadas por combustível e data.
 * @remarks Coberto por `troca-preco.golden.spec.ts` contra janeiro, maio e
 *          junho de 2026. Não altere sem rodar `bun run test:golden`.
 */
export function trocasDePreco(leituras: readonly LeituraPrecoDia[]): TrocaDePreco[] {
    const porCombustivel = new Map<string, Map<string, LeituraPrecoDia[]>>();
    for (const l of leituras) {
        const dias = porCombustivel.get(l.combustivel) ?? new Map<string, LeituraPrecoDia[]>();
        const doDia = dias.get(l.data) ?? [];
        doDia.push(l);
        dias.set(l.data, doDia);
        porCombustivel.set(l.combustivel, dias);
    }

    const trocas: TrocaDePreco[] = [];
    for (const [combustivel, dias] of [...porCombustivel.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const ordenados = [...dias.keys()].sort();
        let precoAnterior: number | null = null;
        for (const dia of ordenados) {
            const preco = precoDominanteDoDia(dias.get(dia) ?? []);
            if (preco == null) continue;
            if (precoAnterior != null && preco !== precoAnterior) {
                trocas.push({ data: dia, combustivel, precoAntigo: precoAnterior, precoNovo: preco });
            }
            precoAnterior = preco;
        }
    }
    return trocas;
}

/**
 * Litros no tanque no FIM DA VÉSPERA de `dataTroca`.
 *
 * Régua mais recente ANTERIOR à troca + compras − vendas entre a régua e a
 * véspera (limites: `data > régua` e `data < dataTroca`). A subtração em si é
 * de {@link resumoEstoque} — este módulo só recorta o período.
 *
 * @returns Litros, ou `null` se não houver régua anterior à troca.
 */
export function estoqueNaVespera(
    combustivel: string,
    dataTroca: string,
    reguas: readonly ReguaComData[],
    compras: readonly CompraComData[],
    vendas: readonly LeituraPrecoDia[],
): number | null {
    let regua: ReguaComData | null = null;
    for (const r of reguas) {
        if (r.combustivel !== combustivel || r.data >= dataTroca) continue;
        if (regua === null || r.data > regua.data) regua = r;
    }
    if (regua === null) return null;

    const inicio = regua.data;
    let litrosComprados = 0;
    for (const c of compras) {
        if (c.combustivel === combustivel && c.data > inicio && c.data < dataTroca) litrosComprados += c.litros;
    }
    let litrosVendidos = 0;
    for (const v of vendas) {
        if (v.combustivel === combustivel && v.data > inicio && v.data < dataTroca) litrosVendidos += v.litrosVendidos;
    }

    const { produtos: [linha] } = resumoEstoque([{
        produto: combustivel,
        estoqueAnterior: regua.litros,
        litrosComprados,
        litrosVendidos,
        estoqueMedido: null,
    }]);
    return linha.estoqueTeorico;
}

/**
 * O impacto de cada troca de preço do período (Issue #61).
 *
 * @param leituras Leituras diárias com preço — também são as vendas da corrente.
 * @param compras  Cargas com data (para a corrente E para o custo médio do mês).
 * @param reguas   Medições físicas de tanque.
 * @returns Uma linha por troca, na ordem de {@link trocasDePreco}.
 * @remarks `ganhoPerdaCentavos = litros × Δpreço`, decisão registrada na
 *          Issue #61: o custo médio é exibido como contexto e não entra na
 *          conta. Mudar isso é mudança de fórmula (§0.6) — golden antes.
 */
export function impactoTrocaDePreco(
    leituras: readonly LeituraPrecoDia[],
    compras: readonly CompraComData[],
    reguas: readonly ReguaComData[],
): ImpactoTroca[] {
    return trocasDePreco(leituras).map((troca) => {
        const litrosNoTanque = estoqueNaVespera(troca.combustivel, troca.data, reguas, compras, leituras);

        const mesDaTroca = troca.data.slice(0, 7);
        const comprasDoMes = compras
            .filter((c) => c.combustivel === troca.combustivel && c.data.slice(0, 7) === mesDaTroca)
            .map((c) => ({ litros: c.litros, valorTotal: c.valorTotal }));
        const custoMedioLitro = custoMedioCompra(comprasDoMes);

        const ganhoPerdaCentavos = litrosNoTanque == null
            ? null
            : Math.round(litrosNoTanque * (troca.precoNovo - troca.precoAntigo) * 100);

        const direcao: DirecaoTroca = troca.precoNovo > troca.precoAntigo ? 'subida' : 'descida';
        const margemAntigaLitro = custoMedioLitro == null ? null : troca.precoAntigo - custoMedioLitro;
        const margemNovaLitro = custoMedioLitro == null ? null : troca.precoNovo - custoMedioLitro;
        const valorEstoqueAntigoCentavos = litrosNoTanque == null
            ? null
            : Math.round(litrosNoTanque * troca.precoAntigo * 100);
        const valorEstoqueNovoCentavos = valorEstoqueAntigoCentavos == null || ganhoPerdaCentavos == null
            ? null
            : valorEstoqueAntigoCentavos + ganhoPerdaCentavos;

        return {
            ...troca,
            direcao,
            litrosNoTanque,
            custoMedioLitro,
            margemAntigaLitro,
            margemNovaLitro,
            valorEstoqueAntigoCentavos,
            valorEstoqueNovoCentavos,
            ganhoPerdaCentavos,
        };
    });
}

/** Total do período em centavos: soma só das trocas com estoque apurável. */
export function totalGanhoPerdaCentavos(impactos: readonly ImpactoTroca[]): number {
    return impactos.reduce((soma, i) => soma + (i.ganhoPerdaCentavos ?? 0), 0);
}

/** Um lado do resumo por direção: quantas trocas e quanto somaram. */
export interface LadoDirecao {
    /** Número de trocas na direção — inclui as não apuráveis (sem régua). */
    readonly quantidade: number;
    /** Soma de `ganhoPerdaCentavos` das trocas APURÁVEIS da direção. */
    readonly totalCentavos: number;
}

/** O mês visto por direção de troca (Issue #70). */
export interface ResumoPorDirecao {
    readonly subidas: LadoDirecao;
    readonly descidas: LadoDirecao;
    /** `subidas.totalCentavos + descidas.totalCentavos` — igual a {@link totalGanhoPerdaCentavos}. */
    readonly liquidoCentavos: number;
}

/**
 * Agrega os impactos do período em subidas × descidas de preço (Issue #70).
 *
 * @remarks Troca sem estoque apurável conta na `quantidade` (a troca
 *          aconteceu), mas não soma no total — mesma regra de
 *          {@link totalGanhoPerdaCentavos}, que este resumo decompõe.
 */
export function resumoPorDirecao(impactos: readonly ImpactoTroca[]): ResumoPorDirecao {
    const lado = (direcao: DirecaoTroca): LadoDirecao => {
        const doLado = impactos.filter((i) => i.direcao === direcao);
        return {
            quantidade: doLado.length,
            totalCentavos: doLado.reduce((soma, i) => soma + (i.ganhoPerdaCentavos ?? 0), 0),
        };
    };
    const subidas = lado('subida');
    const descidas = lado('descida');
    return { subidas, descidas, liquidoCentavos: totalGanhoPerdaCentavos(impactos) };
}
