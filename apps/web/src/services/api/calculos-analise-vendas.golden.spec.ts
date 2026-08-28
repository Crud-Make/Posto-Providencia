/**
 * Golden da conta de lucro da ANÁLISE DE VENDAS (sítio 3.3) contra a canônica.
 *
 * Exercita `linhaLucroProduto`/`despesaPorLitroVendido` — o código REAL que
 * `salesAnalysis.service.ts` chama — lado a lado com `@posto/utils/lucro`,
 * sobre os 7 meses de `docs/data/posto_jorro_2026.sqlite`, e afirma:
 *
 *   1. a ESTRUTURA da conta é a canônica: alimentada com o custo do mês
 *      (`media_lt`), empata a menos da quantização (`emCentavos`, que o
 *      serviço não aplica), e a margem é a mesma `lucro ÷ receita`;
 *   2. a divergência REAL é a FONTE do custo: em produção o serviço lê o
 *      carimbo `Estoque.custo_medio`, gravado pela média ponderada com
 *      estoque anterior — a diferença mês a mês é o mesmo `IMPACTO_MENSAL`
 *      do golden `estoque-encadeamento` (até R$ 2.582 em abril), agora
 *      atravessando a função de produção da tela.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
    custoMedioPonderado,
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

// ─── 2. A divergência real: o carimbo ponderado no lugar do custo do mês ────────

/**
 * Quanto o carimbo ponderado desloca o lucro do mês, em reais — os MESMOS
 * números de `estoque-encadeamento.golden.spec.ts` (`IMPACTO_MENSAL`), aqui
 * atravessando a função de produção da tela. Positivo = a tela SUBESTIMA o
 * lucro do mês.
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

test('com o carimbo ponderado, a tela erra o lucro do mês em até R$ 2.582', () => {
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
                custoMedioPonderado({
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
