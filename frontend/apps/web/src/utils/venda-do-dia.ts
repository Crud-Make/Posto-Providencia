/**
 * A venda do dia PELO ENCERRANTE, a partir do que a tela do fechamento guarda (#103 P8).
 *
 * @remarks
 * Adaptação de tela sobre a fórmula canônica — não é fórmula. Por bico com `fechamento`
 * preenchido (o mesmo filtro de `montarDiaDeclarado.ts:65`: a leitura-base, `fechamento: ''`,
 * fica de fora), o valor é `valorDaLeitura(leitura, bico.combustivel.preco_venda)` — a MESMA
 * conta por bico que o painel já declara ao servidor em `montarDiaDeclarado.ts:77`. A soma é
 * `totalVendasDoEncerrante` (`@posto/utils/leitura`), em centavos a cada parcela, que devolve
 * `null` quando há menos bicos lidos que bicos no cadastro (I8: "não apurado" ≠ "zero").
 *
 * Substitui `calcularTotais` (`calculators.ts`) como fonte do `total_vendas` do painel, pela
 * decisão do dono de 20/09/2026 (Design Doc `fechamento-diario-api.md` §7 d): quem manda é o
 * encerrante. Diferenças de propósito em relação ao legado:
 *   - soma quantizada a cada parcela, não em float com quantização tardia;
 *   - `null` quando o dia não está apurado, em vez de `0` — o `0` escondia o dia sem encerrante
 *     (`FooterAcoes.tsx`, 19/08/2026) e gravava "apurou e deu zero" onde ninguém apurou.
 *
 * O que NÃO muda aqui: a entrada continua sendo `bico.combustivel.preco_venda`, o preço de HOJE.
 * A divergência de R$ 23.784,61 de janeiro/2026 é de PREÇO, não de soma, e esta função não a
 * apaga — está medida em `venda-do-dia.golden.spec.ts` e no Design Doc.
 *
 * `bicos` já vem filtrado por `ativo` nos dois caminhos de carga (`bico.api.ts:63`,
 * `bico.service.ts:52`): `bicos.length` É a contagem de bicos ativos.
 *
 * Fica em `apps/web/src/utils` (e não em `packages/utils`) pelo motivo de `calculators.ts:16-22`:
 * subir arrastaria o tipo de UI `BicoComDetalhes` e as strings BR da tela.
 *
 * Coberto por `venda-do-dia.golden.spec.ts` (31 dias reais de janeiro/2026) e por
 * `venda-do-dia.test.ts`. Não altere sem rodar `bun run test:golden`.
 */
import { litrosVendidos, totalVendasDoEncerrante, valorDaLeitura, type LeituraDeBico } from '@posto/utils';
import type { BicoComDetalhes } from '../types/fechamento';
import { analisarValor } from './formatters';

/** As leituras como a tela as guarda: strings BR, indexadas pelo id do bico. */
export type LeiturasDaTela = Readonly<Record<number, { inicial: string; fechamento: string }>>;

export interface VendaDoDia {
    /** `total_vendas` pelo encerrante, em reais quantizados — ou `null` = dia NÃO apurado (I8). */
    readonly totalVendas: number | null;
    /** Litros vendidos nos bicos lidos, com três casas (a `Leitura` é `decimal:3`). */
    readonly totalLitros: number;
}

/** Milésimos por litro: a escala inteira em que os litros são somados, para não derrapar em float. */
const MILESIMOS = 1000;

/** A leitura de um bico em número, a partir das strings BR da tela; `undefined` = bico não lido. */
function leituraLida(leituras: LeiturasDaTela, bicoId: number): LeituraDeBico | undefined {
    const daTela = leituras[bicoId];
    if (daTela === undefined || daTela.fechamento === '') return undefined;
    return { inicial: analisarValor(daTela.inicial), fechamento: analisarValor(daTela.fechamento) };
}

/**
 * A venda e os litros do dia, pelo encerrante, a partir do estado da tela.
 *
 * @param bicos    Os bicos ativos do cadastro, como a tela os carregou.
 * @param leituras As leituras da tela, por id de bico.
 * @returns `totalVendas` `null` quando há menos bicos lidos que `bicos.length` (ou nenhum).
 */
export function vendaDoDiaPeloEncerrante(bicos: readonly BicoComDetalhes[], leituras: LeiturasDaTela): VendaDoDia {
    const valores: number[] = [];
    let milesimos = 0;

    for (const bico of bicos) {
        const leitura = leituraLida(leituras, bico.id);
        if (leitura === undefined) continue;

        valores.push(valorDaLeitura(leitura, bico.combustivel.preco_venda));
        milesimos += Math.round(litrosVendidos(leitura) * MILESIMOS);
    }

    return {
        totalVendas: totalVendasDoEncerrante(valores, bicos.length),
        totalLitros: milesimos / MILESIMOS,
    };
}
