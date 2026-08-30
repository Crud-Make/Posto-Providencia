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
     * Primeiro dia em que o preço ANTIGO vigorou, dentro da janela de leituras
     * fornecida: a troca anterior do mesmo combustível ou, sem troca anterior,
     * o primeiro dia da janela com preço conhecido. É vigência MÍNIMA — se a
     * janela começa no meio da vida do preço, conta-se só o que se enxerga.
     * `null` se não houver dia anterior com preço (não ocorre em troca real,
     * que exige preço anterior conhecido).
     */
    readonly precoAntigoDesde: string | null;
    /**
     * Dias corridos em que o preço antigo vigorou (de `precoAntigoDesde` até a
     * véspera da troca, contando as duas pontas). É o "por X dias o litro saiu
     * a Y" da tela do proprietário. `null` quando `precoAntigoDesde` é `null`.
     */
    readonly diasComPrecoAntigo: number | null;
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
    /**
     * Litros do combustível VENDIDOS desde o dia da troca (inclusive), dentro
     * da janela de leituras fornecida — o encerrante realizado ao preço novo.
     */
    readonly litrosVendidosDesdeATroca: number;
    /**
     * Lucro extra (ou a menos) JÁ REALIZADO nas vendas desde a troca:
     * `litrosVendidosDesdeATroca × Δpreço`, em CENTAVOS inteiros. O custo
     * cancela na comparação (mesmo custo nos dois cenários) — sobra o Δpreço.
     * Zero quando nada foi vendido desde a troca.
     */
    readonly ganhoVendasCentavos: number;
    /**
     * Média de litros/dia vendidos desde a troca (só dias com venda).
     * `null` quando ainda não houve dia com venda ao preço novo.
     */
    readonly mediaLitrosDiaDesdeATroca: number | null;
    /** `mediaLitrosDia × Δpreço`, centavos: o efeito da troca por dia de venda. `null` sem venda. */
    readonly ganhoPorDiaCentavos: number | null;
    /** `ganhoPorDia × 30`: o ritmo mensal do efeito, no ritmo de venda atual. `null` sem venda. */
    readonly ritmoMensalCentavos: number | null;
    /**
     * Lucro BRUTO por dia de venda AO PREÇO ANTIGO: `mediaLitrosDia ×
     * margemAntigaLitro`, centavos. "Como fica a cada encerrante": o que um
     * dia típico rendia antes da troca. `null` sem venda ou sem compra no mês.
     */
    readonly lucroDiaAntigoCentavos: number | null;
    /** Idem ao preço NOVO: `mediaLitrosDia × margemNovaLitro`. `null` sem venda ou sem compra. */
    readonly lucroDiaNovoCentavos: number | null;
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
function agruparPorCombustivelEDia(
    leituras: readonly LeituraPrecoDia[],
): Map<string, Map<string, LeituraPrecoDia[]>> {
    const porCombustivel = new Map<string, Map<string, LeituraPrecoDia[]>>();
    for (const l of leituras) {
        const dias = porCombustivel.get(l.combustivel) ?? new Map<string, LeituraPrecoDia[]>();
        const doDia = dias.get(l.data) ?? [];
        doDia.push(l);
        dias.set(l.data, doDia);
        porCombustivel.set(l.combustivel, dias);
    }
    return porCombustivel;
}

export function trocasDePreco(leituras: readonly LeituraPrecoDia[]): TrocaDePreco[] {
    const porCombustivel = agruparPorCombustivelEDia(leituras);

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
 * @returns Litros, ou `null` quando não há como apurar: sem régua anterior à
 *          troca, OU corrente NEGATIVA (Issue #72). Tanque negativo não
 *          existe; teórico < 0 significa corrente cega — no dado real, compras
 *          da carga histórica carimbadas no fim do mês, invisíveis para troca
 *          no meio dele. Devolver o negativo era expor "−5.784 L" ao dono.
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
    // Corrente negativa = não apurável (#72) — mesma semântica de "sem régua".
    return linha.estoqueTeorico < 0 ? null : linha.estoqueTeorico;
}

/** Dias corridos entre duas datas ISO locais, contando as DUAS pontas. */
function diasCorridosInclusivos(inicio: string, fim: string): number {
    // slice(0, 10): aceita 'YYYY-MM-DDTHH:MM:SS' sem virar NaN — o banco já
    // devolveu timestamp onde se esperava só a data (bug real de 30/08).
    const [a1, m1, d1] = inicio.slice(0, 10).split('-').map(Number);
    const [a2, m2, d2] = fim.slice(0, 10).split('-').map(Number);
    // Date.UTC puro: sem fuso local, que já escorregou leitura em um dia aqui.
    return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000) + 1;
}

/**
 * A véspera de uma data ISO local (`2026-03-01` → `2026-02-28`).
 * Aritmética pura de calendário — sem `Date`, que o lint proíbe para data de
 * calendário (`toISOString()` em GMT-3 pula um dia depois das 21h).
 */
function vesperaDe(dataIso: string): string {
    const [a, m, d] = dataIso.slice(0, 10).split('-').map(Number);
    if (d > 1) return `${a}-${String(m).padStart(2, '0')}-${String(d - 1).padStart(2, '0')}`;
    const mesAnterior = m === 1 ? 12 : m - 1;
    const anoDaVespera = m === 1 ? a - 1 : a;
    const bissexto = (anoDaVespera % 4 === 0 && anoDaVespera % 100 !== 0) || anoDaVespera % 400 === 0;
    const DIAS_NO_MES = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const ultimoDia = DIAS_NO_MES[mesAnterior - 1];
    return `${anoDaVespera}-${String(mesAnterior).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
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
    const trocas = trocasDePreco(leituras);

    const primeiroDiaComPreco = new Map<string, string>();
    for (const l of leituras) {
        if (l.precoLitro == null) continue;
        const atual = primeiroDiaComPreco.get(l.combustivel);
        if (atual === undefined || l.data < atual) primeiroDiaComPreco.set(l.combustivel, l.data);
    }

    return trocas.map((troca) => {
        const trocaAnterior = trocas
            .filter((t) => t.combustivel === troca.combustivel && t.data < troca.data)
            .at(-1);
        const precoAntigoDesde = trocaAnterior?.data ?? primeiroDiaComPreco.get(troca.combustivel) ?? null;
        const diasComPrecoAntigo = precoAntigoDesde == null
            ? null
            : diasCorridosInclusivos(precoAntigoDesde, vesperaDe(troca.data));
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

        const deltaPreco = troca.precoNovo - troca.precoAntigo;
        let litrosVendidosDesdeATroca = 0;
        const diasComVenda = new Set<string>();
        for (const l of leituras) {
            if (l.combustivel !== troca.combustivel || l.data < troca.data) continue;
            litrosVendidosDesdeATroca += l.litrosVendidos;
            if (l.litrosVendidos > 0) diasComVenda.add(l.data);
        }
        const ganhoVendasCentavos = Math.round(litrosVendidosDesdeATroca * deltaPreco * 100);
        const mediaLitrosDiaDesdeATroca = diasComVenda.size > 0
            ? litrosVendidosDesdeATroca / diasComVenda.size
            : null;
        const ganhoPorDiaCentavos = mediaLitrosDiaDesdeATroca == null
            ? null
            : Math.round(mediaLitrosDiaDesdeATroca * deltaPreco * 100);
        const ritmoMensalCentavos = mediaLitrosDiaDesdeATroca == null
            ? null
            : Math.round(mediaLitrosDiaDesdeATroca * deltaPreco * 30 * 100);
        const lucroDiaAntigoCentavos = mediaLitrosDiaDesdeATroca == null || margemAntigaLitro == null
            ? null
            : Math.round(mediaLitrosDiaDesdeATroca * margemAntigaLitro * 100);
        const lucroDiaNovoCentavos = mediaLitrosDiaDesdeATroca == null || margemNovaLitro == null
            ? null
            : Math.round(mediaLitrosDiaDesdeATroca * margemNovaLitro * 100);

        return {
            ...troca,
            direcao,
            precoAntigoDesde,
            diasComPrecoAntigo,
            litrosNoTanque,
            custoMedioLitro,
            margemAntigaLitro,
            margemNovaLitro,
            valorEstoqueAntigoCentavos,
            valorEstoqueNovoCentavos,
            ganhoPerdaCentavos,
            litrosVendidosDesdeATroca,
            ganhoVendasCentavos,
            mediaLitrosDiaDesdeATroca,
            ganhoPorDiaCentavos,
            ritmoMensalCentavos,
            lucroDiaAntigoCentavos,
            lucroDiaNovoCentavos,
        };
    });
}

/** Total do período em centavos: soma só das trocas com estoque apurável. */
export function totalGanhoPerdaCentavos(impactos: readonly ImpactoTroca[]): number {
    return impactos.reduce((soma, i) => soma + (i.ganhoPerdaCentavos ?? 0), 0);
}

/** Total do lucro extra já realizado nas VENDAS desde as trocas, em centavos. */
export function totalGanhoVendasCentavos(impactos: readonly ImpactoTroca[]): number {
    return impactos.reduce((soma, i) => soma + i.ganhoVendasCentavos, 0);
}

/** O mês das trocas em três números: o que rendeu, o que custou, o saldo. */
export interface BalancoTrocas {
    /** Soma das parcelas POSITIVAS (estoque e vendas), em centavos. */
    readonly lucroCentavos: number;
    /** Soma das parcelas NEGATIVAS (estoque e vendas), em centavos — sempre ≤ 0. */
    readonly prejuizoCentavos: number;
    /** `lucro + prejuizo` — igual a estoque líquido + vendas. */
    readonly saldoCentavos: number;
}

/**
 * Balanço mensal das trocas (card geral da Issue #70): separa em lucro e
 * prejuízo as parcelas de cada troca. Estoque parado e vendas contam como
 * parcelas INDEPENDENTES, porque numa mesma troca elas podem ter sinais
 * opostos (etanol de janeiro/2026: estoque −R$ 84,42 e vendas +R$ 2.099,12).
 * Troca sem estoque apurável contribui só com a parcela de vendas.
 */
export function balancoTrocasCentavos(impactos: readonly ImpactoTroca[]): BalancoTrocas {
    let lucroCentavos = 0;
    let prejuizoCentavos = 0;
    for (const impacto of impactos) {
        for (const parcela of [impacto.ganhoPerdaCentavos ?? 0, impacto.ganhoVendasCentavos]) {
            if (parcela >= 0) lucroCentavos += parcela;
            else prejuizoCentavos += parcela;
        }
    }
    return { lucroCentavos, prejuizoCentavos, saldoCentavos: lucroCentavos + prejuizoCentavos };
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

/** Um ponto da série diária de preço (gráfico "só o diesel subiu?", Issue #70). */
export interface PontoPrecoDia {
    /** Dia em ISO local (`YYYY-MM-DD`). */
    readonly data: string;
    /** Preço dominante do dia, em reais/L. */
    readonly preco: number;
}

/** A série diária de preço de um combustível. */
export interface SeriePrecoDiario {
    readonly combustivel: string;
    /** Ordenada por data. Dia sem preço registrado fica FORA — nunca vira zero. */
    readonly pontos: readonly PontoPrecoDia[];
}

/**
 * O preço dominante de cada dia, por combustível — a matéria-prima do gráfico
 * de linhas da seção de trocas ("foi só o diesel ou mexeu tudo?").
 *
 * @remarks Mesma regra de dominância de {@link trocasDePreco} (o bico que mais
 *          vendeu define o preço do dia); a detecção por trás já tem golden, a
 *          seleção da série é coberta por unitário.
 */
export function seriePrecoDiario(leituras: readonly LeituraPrecoDia[]): SeriePrecoDiario[] {
    return [...agruparPorCombustivelEDia(leituras).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([combustivel, dias]) => ({
            combustivel,
            pontos: [...dias.keys()]
                .sort()
                .map((dia) => ({ data: dia, preco: precoDominanteDoDia(dias.get(dia) ?? []) }))
                .filter((p): p is PontoPrecoDia => p.preco != null),
        }));
}
