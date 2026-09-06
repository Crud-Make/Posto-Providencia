/**
 * Golden da conta de lucro da ANÁLISE DE VENDAS (sítio 3.3).
 *
 * [onda 3, grupo B] CONSOLIDADO: `linhaLucroProduto` delega à canônica e o
 * serviço alimenta o custo com a COMPRA DO PRÓPRIO MÊS (`custoMedioCompra`),
 * não mais o carimbo `Estoque.custo_medio`. Este golden afirma, sobre os 7
 * meses de `docs/data/posto_jorro_2026.sqlite`:
 *
 *   1. a produção É a canônica: com o custo do mês (`media_lt`), empata
 *      (agora quantizada por `emCentavos`) e a margem é `lucro ÷ receita`;
 *   2. o ANTES/DEPOIS da troca de fonte: alimentar a MESMA função com o
 *      carimbo ponderado (como a tela fazia) desloca o lucro do mês nos
 *      valores de `IMPACTO_MENSAL` — até R$ 2.582 em abril, os mesmos números
 *      do golden `estoque-encadeamento`. Positivo = a tela SUBESTIMAVA.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
    despesaOperacionalPorLitro,
    lucroCombustivel,
    margemPercentual,
    somarDespesas,
} from '@posto/utils';
import { despesaPorLitroVendido, linhaLucroProduto } from './calculos-analise-vendas';

const SQLITE = `${import.meta.dir}/../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

const MESES = [1, 2, 3, 4, 5, 6, 7] as const;

const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

interface ProdutoMes {
    produto: string;
    litros: number;
    valor: number;
}

/** Vendas do mês agregadas por produto, como o serviço agrega por combustível. */
function vendasDoMes(mes: number): ProdutoMes[] {
    const porProduto = new Map<string, ProdutoMes>();
    const bicos = db
        .query('SELECT bico, litros, valor_lt, venda FROM resumo_mensal_bico WHERE ano=2026 AND mes=?')
        .all(mes) as { bico: string; litros: number; valor_lt: number | null; venda: number }[];
    for (const b of bicos) {
        const nome = PRODUTO_DO_BICO[b.bico];
        const atual = porProduto.get(nome) ?? { produto: nome, litros: 0, valor: 0 };
        atual.litros += b.litros;
        atual.valor += b.valor_lt !== null ? b.litros * b.valor_lt : b.venda;
        porProduto.set(nome, atual);
    }
    return [...porProduto.values()];
}

const custosDoMes = (mes: number): Record<string, number> => {
    const mapa: Record<string, number> = {};
    for (const c of db
        .query('SELECT produto, media_lt FROM compra_mensal WHERE ano=2026 AND mes=?')
        .all(mes) as { produto: string; media_lt: number }[]) {
        mapa[c.produto] = c.media_lt;
    }
    return mapa;
};

const despesaLancada = (mes: number): number =>
    somarDespesas(
        db
            .query('SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes=?')
            .all(mes) as { categoria: string | null; valor: number | null }[]
    );

// ─── 1. A estrutura é a canônica (a divergência não está na conta em si) ────────

for (const mes of MESES) {
    test(`mês ${String(mes).padStart(2, '0')}: com o custo do mês, a tela empata com a canônica`, () => {
        const vendas = vendasDoMes(mes);
        const custos = custosDoMes(mes);
        const despesa = despesaLancada(mes);
        const litrosTotal = vendas.reduce((s, v) => s + v.litros, 0);

        const despLt = despesaPorLitroVendido(despesa, litrosTotal);
        expect(despLt).toBeCloseTo(despesaOperacionalPorLitro(despesa, litrosTotal), 12);

        let daTela = 0;
        let canonico = 0;
        for (const v of vendas) {
            const linha = linhaLucroProduto({
                litros: v.litros,
                valor: v.valor,
                custoMedio: custos[v.produto],
                despesaPorLitro: despLt,
                precoVendaCadastro: 0,
            });
            daTela += linha.lucroTotal;
            canonico += lucroCombustivel({
                litros: v.litros,
                precoVenda: v.valor / v.litros,
                custoMedio: custos[v.produto],
                despesaOperacionalLitro: despLt,
            });
            // margem da tela = lucro ÷ receita, a mesma definição canônica
            expect(linha.margin).toBeCloseTo(margemPercentual(linha.lucroTotal, v.valor), 6);
        }
        // Diferença admissível: só a quantização por produto (4 × meio centavo).
        expect(Math.abs(daTela - canonico)).toBeLessThan(0.05);
    });
}

// ─── 2. [onda 3, grupo B] O antes/depois da troca de fonte do custo ─────────────

/**
 * Quanto o carimbo ponderado (a fonte ANTIGA) deslocava o lucro do mês, em
 * reais — os MESMOS números de `estoque-encadeamento.golden.spec.ts`
 * (`IMPACTO_MENSAL`), atravessando a função de produção da tela. Positivo =
 * a tela SUBESTIMAVA o lucro do mês.
 */
const IMPACTO_MENSAL: Readonly<Record<number, number>> = {
    1: 0,
    2: 1337.6,
    3: -1986.18,
    4: -2582.18,
    5: 1113.0,
    6: 1547.16,
    7: 703.3,
};

/**
 * A fórmula MORTA, reconstruída só para este teste: média ponderada do estoque
 * anterior com a compra, que `compra.service.ts` carimbava em `Estoque.custo_medio`
 * até 03/09/2026. `custoMedioPonderado` foi apagada de `@posto/utils` em
 * 06/09/2026 (sem consumidor de produção); ela vive aqui como arqueologia, para
 * a divergência abaixo continuar medida contra a função de produção da tela.
 * Não é réplica (§7): não há mais original para divergir dela.
 */
const custoPonderadoLegado = (i: {
    estoqueAnterior: number;
    custoMedioAnterior: number;
    litrosCompra: number;
    custoLitroCompra: number;
}): number => {
    const total = i.estoqueAnterior + i.litrosCompra;
    return total > 0
        ? (i.estoqueAnterior * i.custoMedioAnterior + i.litrosCompra * i.custoLitroCompra) / total
        : i.custoLitroCompra;
};

test('a fonte antiga (carimbo ponderado) errava o lucro do mês em até R$ 2.582 — a troca desfaz isso', () => {
    const custoCarimbado = new Map<string, number>();

    for (const mes of MESES) {
        const vendas = vendasDoMes(mes);
        const custos = custosDoMes(mes);
        const despesa = despesaLancada(mes);
        const litrosTotal = vendas.reduce((s, v) => s + v.litros, 0);
        const despLt = despesaPorLitroVendido(despesa, litrosTotal);

        // Recria o carimbo como compra.service.ts o grava: uma compra mensal
        // ponderada com o estoque anterior (a régua `ano_passado` do mês).
        const compras = db
            .query('SELECT produto, compra_lt, compra_rs FROM compra_mensal WHERE ano=2026 AND mes=?')
            .all(mes) as { produto: string; compra_lt: number; compra_rs: number }[];
        const reguas = new Map(
            (
                db
                    .query('SELECT produto, ano_passado FROM estoque_mensal WHERE ano=2026 AND mes=?')
                    .all(mes) as { produto: string; ano_passado: number }[]
            ).map((l) => [l.produto, l.ano_passado])
        );
        for (const c of compras) {
            custoCarimbado.set(
                c.produto,
                custoPonderadoLegado({
                    estoqueAnterior: reguas.get(c.produto)!,
                    custoMedioAnterior: custoCarimbado.get(c.produto) ?? custos[c.produto],
                    litrosCompra: c.compra_lt,
                    custoLitroCompra: c.compra_rs / c.compra_lt,
                })
            );
        }

        const lucroTela = (custoDe: (p: string) => number): number =>
            vendas.reduce(
                (s, v) =>
                    s +
                    linhaLucroProduto({
                        litros: v.litros,
                        valor: v.valor,
                        custoMedio: custoDe(v.produto),
                        despesaPorLitro: despLt,
                        precoVendaCadastro: 0,
                    }).lucroTotal,
                0
            );

        const comCustoDoMes = lucroTela((p) => custos[p]);
        const comCarimbo = lucroTela((p) => custoCarimbado.get(p)!);

        expect(comCustoDoMes - comCarimbo).toBeCloseTo(IMPACTO_MENSAL[mes], 1);
    }
});
