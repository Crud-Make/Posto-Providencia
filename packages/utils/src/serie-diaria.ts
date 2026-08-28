/**
 * As séries dia a dia do mês — venda, entrega e nível de estoque.
 *
 * @remarks
 * Módulo puro, sem I/O. Substitui a simulação que a tela usava enquanto não
 * estava ligada ao banco: aqui **toda barra é um dia que existiu**, tirada da
 * `Leitura` (litros por dia) e da `Compra` (data de cada entrega).
 *
 * A diferença não é cosmética. A curva simulada distribuía o total do mês com um
 * gerador de semente fixa — a soma batia e nenhuma barra era verdadeira. Um
 * gráfico assim responde "vendeu mais no dia 12?" com um número inventado, e num
 * sistema que decide preço de bomba isso é pior que não ter gráfico.
 *
 * Dia é **número do dia do mês** (1 a 31), nunca `Date`: o banco grava em UTC e o
 * posto está em GMT-3, então converter para horário local joga cada leitura um
 * dia para trás. Quem chama recorta a string ISO e passa o inteiro.
 *
 * @module @posto/utils/serie-diaria
 */
import { emCentavos } from './lucro';

/** Litros vendidos num dia do mês. */
export interface VendaDoDia {
    readonly dia: number;
    readonly litros: number;
}

/** Uma entrega de combustível: litros e valor pago, no dia em que chegou. */
export interface EntregaDoDia {
    readonly dia: number;
    readonly litros: number;
    /** Valor pago, em reais. */
    readonly valor: number;
}

/** Um ponto da série de venda. */
export interface PontoVenda {
    readonly dia: number;
    readonly litros: number;
    /** Litros vendidos do dia 1 até este dia. */
    readonly acumulado: number;
}

/** Um ponto da série de estoque. */
export interface PontoEstoque {
    readonly dia: number;
    /** Litros que entraram no dia (entregas). */
    readonly entrou: number;
    /** Litros que saíram no dia (venda). */
    readonly saiu: number;
    /** Litros em tanque ao fim do dia. */
    readonly nivel: number;
}

/** Uma entrega já agregada por data, com o preço que ela custou. */
export interface PontoEntrega {
    readonly dia: number;
    readonly litros: number;
    readonly valor: number;
    /** `valor ÷ litros` (R$/L). `null` quando a entrega veio sem litros. */
    readonly precoLitro: number | null;
}

export interface SerieVenda {
    readonly pontos: readonly PontoVenda[];
    readonly total: number;
    /** Maior venda diária do mês, em litros. `0` num mês sem venda. */
    readonly pico: number;
    /** Total ÷ dias **com venda lançada** — não ÷ dias do mês. */
    readonly mediaDiaria: number;
    /** Quantos dias tiveram venda lançada. */
    readonly diasComVenda: number;
}

export interface SerieEstoque {
    readonly pontos: readonly PontoEstoque[];
    /** Maior nível alcançado, incluindo o estoque de abertura. */
    readonly pico: number;
    /** Nível no último dia da série. */
    readonly nivelFinal: number;
}

/** Litros somados em mililitro inteiro, para não acumular ruído de float. */
const somaLitros = (valores: readonly number[]): number =>
    valores.reduce((acc, v) => acc + Math.round(v * 1000), 0) / 1000;

/**
 * Venda dia a dia, com o acumulado do mês.
 *
 * @param vendas - Litros por dia. Vários registros do mesmo dia são somados.
 * @param diasNoMes - Quantos dias a série cobre.
 *
 * @remarks A média é sobre os dias **com venda lançada**, não sobre os dias do
 *          mês. Num mês ainda em curso — ou num mês em replay, com metade dos
 *          dias por lançar — dividir por 30 devolveria uma média baixa que
 *          parece queda de movimento, quando é só dia que ninguém lançou ainda.
 */
export function serieVendaDiaria(
    vendas: readonly VendaDoDia[],
    diasNoMes: number
): SerieVenda {
    const porDia = agruparPorDia(vendas, diasNoMes, (v) => v.litros);

    let acumulado = 0;
    const pontos: PontoVenda[] = porDia.map((litros, i) => {
        acumulado = somaLitros([acumulado, litros]);
        return { dia: i + 1, litros, acumulado };
    });

    const diasComVenda = porDia.filter((l) => l > 0).length;
    const total = somaLitros(porDia);

    return {
        pontos,
        total,
        pico: porDia.length > 0 ? Math.max(...porDia) : 0,
        mediaDiaria: diasComVenda > 0 ? total / diasComVenda : 0,
        diasComVenda,
    };
}

/** Litros vendidos num mês (`mes` em ISO `aaaa-mm`). */
export interface VendaDoMes {
    readonly mes: string;
    readonly litros: number;
}

/** Um ponto da série mensal de venda. */
export interface PontoVendaMensal {
    /** Mês em ISO `aaaa-mm`. */
    readonly mes: string;
    readonly litros: number;
}

/**
 * Volume vendido mês a mês, numa janela fixa que termina em `mesFinal`.
 *
 * @param vendas - Litros por mês (`aaaa-mm`). Vários registros do mesmo mês são somados.
 * @param mesFinal - Último mês da janela, ISO `aaaa-mm`.
 * @param quantidadeMeses - Tamanho da janela (ex.: 6 para "últimos 6 meses").
 *
 * @remarks
 * Substitui o preenchimento por `Math.random()` que o gráfico de evolução usava
 * para os meses sem busca: aqui **toda barra é um mês que existiu** — mês sem
 * venda lançada aparece como 0, nunca como número sorteado. Mesma razão de ser
 * de {@link serieVendaDiaria}. Aritmética de mês é feita sobre a string ISO,
 * nunca sobre `Date`: o banco grava em UTC e converter escorrega um dia.
 * Registro fora da janela é descartado, como em `agruparPorDia`.
 */
export function serieVendaMensal(
    vendas: readonly VendaDoMes[],
    mesFinal: string,
    quantidadeMeses: number
): readonly PontoVendaMensal[] {
    const [anoFinal, mesFinalNum] = mesFinal.split('-').map(Number);
    const indiceFinal = anoFinal * 12 + (mesFinalNum - 1);

    const porMes = new Map<string, number>();
    for (const v of vendas) {
        porMes.set(v.mes, somaLitros([porMes.get(v.mes) ?? 0, v.litros]));
    }

    const pontos: PontoVendaMensal[] = [];
    for (let i = quantidadeMeses - 1; i >= 0; i--) {
        const indice = indiceFinal - i;
        const ano = Math.floor(indice / 12);
        const mesNum = (indice % 12) + 1;
        const mes = `${ano}-${String(mesNum).padStart(2, '0')}`;
        pontos.push({ mes, litros: porMes.get(mes) ?? 0 });
    }
    return pontos;
}

/**
 * Entregas do mês, uma linha por dia em que chegou combustível.
 *
 * @remarks Duas notas no mesmo dia viram uma entrega só, e o preço do litro é o
 *          **ponderado** das duas — média das duas médias daria peso igual a uma
 *          carga de 8.000 L e a uma de 500 L.
 */
export function serieEntregas(entregas: readonly EntregaDoDia[]): readonly PontoEntrega[] {
    const porDia = new Map<number, { litros: number; valor: number }>();

    for (const e of entregas) {
        const atual = porDia.get(e.dia) ?? { litros: 0, valor: 0 };
        porDia.set(e.dia, {
            litros: somaLitros([atual.litros, e.litros]),
            valor: atual.valor + e.valor,
        });
    }

    return [...porDia.entries()]
        .sort(([a], [b]) => a - b)
        .map(([dia, { litros, valor }]) => ({
            dia,
            litros,
            valor: emCentavos(valor),
            precoLitro: litros > 0 ? valor / litros : null,
        }));
}

/**
 * Nível de estoque ao fim de cada dia: entra entrega, sai venda.
 *
 * @param estoqueInicial - Litros em tanque na abertura do período.
 *
 * @remarks É o estoque **teórico** dia a dia — o mesmo modelo do bloco `Estoque`,
 *          esticado no tempo. Ele não conhece perda: a diferença entre esta
 *          curva e a régua no fim do mês **é** a perda, e é justamente por isso
 *          que a curva não pode ser corrigida por ela.
 */
export function serieNivelEstoque(
    estoqueInicial: number,
    vendas: readonly VendaDoDia[],
    entregas: readonly EntregaDoDia[],
    diasNoMes: number
): SerieEstoque {
    const saidaPorDia = agruparPorDia(vendas, diasNoMes, (v) => v.litros);
    const entradaPorDia = agruparPorDia(entregas, diasNoMes, (e) => e.litros);

    let nivel = estoqueInicial;
    const pontos: PontoEstoque[] = saidaPorDia.map((saiu, i) => {
        const entrou = entradaPorDia[i];
        nivel = somaLitros([nivel, entrou, -saiu]);
        return { dia: i + 1, entrou, saiu, nivel };
    });

    return {
        pontos,
        pico: Math.max(estoqueInicial, ...pontos.map((p) => p.nivel)),
        nivelFinal: pontos.length > 0 ? pontos[pontos.length - 1].nivel : estoqueInicial,
    };
}

/**
 * Soma os registros por dia num vetor de tamanho fixo.
 *
 * @remarks Dia fora da faixa é **descartado, não jogado no dia 1**: leitura com
 *          data torta apareceria como um pico de movimento no primeiro dia do
 *          mês, que é o tipo de gráfico que faz alguém investigar um dia que
 *          nunca teve nada de errado.
 */
function agruparPorDia<T extends { dia: number }>(
    registros: readonly T[],
    diasNoMes: number,
    valor: (r: T) => number
): number[] {
    const acumulado = Array.from({ length: diasNoMes }, () => 0);

    for (const r of registros) {
        const i = r.dia - 1;
        if (i < 0 || i >= diasNoMes) continue;
        acumulado[i] = somaLitros([acumulado[i], valor(r)]);
    }

    return acumulado;
}
