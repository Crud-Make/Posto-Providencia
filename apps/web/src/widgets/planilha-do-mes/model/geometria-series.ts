import type { PontoEntrega, SerieEstoque, SerieVenda } from '@posto/utils';

/**
 * Converte as séries diárias em geometria de gráfico.
 *
 * @remarks Só desenho: alturas em porcentagem e pontos de polilinha num viewBox
 *          de `0 0 100 100`. Nenhum número novo nasce aqui — os litros e os
 *          preços já vêm apurados de `@posto/utils/serie-diaria`. Manter a
 *          conversão separada é o que permitiu jogar fora a simulação antiga sem
 *          tocar em nenhum componente.
 */

export interface BarraDia {
    readonly dia: number;
    readonly litros: number;
    /** Altura da barra em porcentagem do eixo, pronta para o CSS. */
    readonly altura: string;
}

export interface GeometriaAcumulada {
    readonly barras: readonly BarraDia[];
    /** Pontos da polilinha, em coordenadas do viewBox. */
    readonly linha: string;
    /** A mesma linha fechada contra a base, para o preenchimento. */
    readonly area: string;
    readonly diasNoMes: number;
}

export interface ColunaEntrega {
    readonly dia: number;
    readonly litros: number;
    readonly precoLitro: number | null;
    readonly altura: string;
}

export interface GeometriaEntregas {
    readonly colunas: readonly ColunaEntrega[];
    readonly linha: string;
}

/** Coordenada X do centro da coluna `i`, num eixo de 0 a 100. */
const eixoX = (i: number, n: number): number => ((i + 0.5) / n) * 100;

const pontos = (coords: readonly (readonly [number, number])[]): string =>
    coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

const fecharArea = (linha: string): string =>
    linha === '' ? '' : `1.67,100 ${linha} 98.33,100`;

/** Venda diária em barras, com o acumulado do mês por cima. */
export function geometriaVenda(serie: SerieVenda): GeometriaAcumulada {
    const dias = serie.pontos.length;
    const pico = Math.max(1, serie.pico);

    const linha = pontos(
        serie.pontos.map((p, i) => {
            const y = 97 - (serie.total > 0 ? (p.acumulado / serie.total) * 92 : 0);
            return [eixoX(i, dias), y] as const;
        })
    );

    return {
        barras: serie.pontos.map((p) => ({
            dia: p.dia,
            litros: p.litros,
            altura: `${(p.litros / pico) * 100}%`,
        })),
        linha,
        area: fecharArea(linha),
        diasNoMes: dias,
    };
}

/** Saída diária em barras, com o nível de estoque por cima. */
export function geometriaEstoque(serie: SerieEstoque): GeometriaAcumulada {
    const dias = serie.pontos.length;
    const picoSaida = Math.max(1, ...serie.pontos.map((p) => p.saiu));
    const picoNivel = Math.max(1, serie.pico);

    const linha = pontos(
        serie.pontos.map(
            (p, i) => [eixoX(i, dias), 97 - (Math.max(0, p.nivel) / picoNivel) * 92] as const
        )
    );

    return {
        barras: serie.pontos.map((p) => ({
            dia: p.dia,
            litros: p.saiu,
            altura: `${(p.saiu / picoSaida) * 100}%`,
        })),
        linha,
        area: fecharArea(linha),
        diasNoMes: dias,
    };
}

/**
 * Entregas em colunas largas, com o preço do litro por cima.
 *
 * @remarks As duas escalas são independentes de propósito: a barra é volume, a
 *          linha é preço. É a divergência entre elas que mostra entrega cara em
 *          mês barato — amarrar as duas à mesma escala esconderia exatamente
 *          isso.
 *
 *          Quando todas as entregas saíram pelo mesmo preço, a linha vai para o
 *          meio em vez de colar no topo ou no fundo: uma reta no extremo do
 *          quadro lê-se como preço recorde, quando é preço estável.
 */
export function geometriaEntregas(entregas: readonly PontoEntrega[]): GeometriaEntregas {
    const pico = Math.max(1, ...entregas.map((e) => e.litros));

    const precos = entregas.map((e) => e.precoLitro).filter((p): p is number => p !== null);
    const menor = precos.length > 0 ? Math.min(...precos) : 0;
    const maior = precos.length > 0 ? Math.max(...precos) : 0;
    const faixa = maior - menor;

    return {
        colunas: entregas.map((e) => ({
            dia: e.dia,
            litros: e.litros,
            precoLitro: e.precoLitro,
            altura: `${(e.litros / pico) * 82}%`,
        })),
        linha: pontos(
            entregas.map((e, i) => {
                const altura =
                    e.precoLitro === null || faixa <= 0 ? 30 : ((e.precoLitro - menor) / faixa) * 62;
                return [eixoX(i, Math.max(1, entregas.length)), 86 - altura] as const;
            })
        ),
    };
}
