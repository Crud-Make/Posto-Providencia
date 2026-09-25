/**
 * Golden master dos blocos COMPRA e ESTOQUE contra os 7 meses reais de 2026.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`. Os dois blocos moram num arquivo
 * só porque compartilham a mesma entrada: o estoque teórico depende dos litros
 * comprados (bloco de compra) e dos litros vendidos (bloco de venda). Separá-los
 * duplicaria o mapeamento bico→produto, que é onde um erro passaria despercebido.
 *
 * Colunas da planilha que servem de gabarito — todas leitura direta de célula,
 * nenhuma calculada pelo ETL:
 *
 * - `compra_mensal.media_lt`     → `LinhaCompra.mediaLitro`
 * - `compra_mensal.valor_venda`  → `LinhaCompra.valorParaVenda`
 * - `estoque_mensal.compra_e_estoque` → `LinhaEstoque.compraEEstoque`
 * - `estoque_mensal.estoque_hoje`     → `LinhaEstoque.estoqueTeorico`
 * - `estoque_mensal.perca_sobra`      → `LinhaEstoque.percaOuSobra`
 *
 * O `estoque_hoje` da planilha é o número mais sensível do sistema: é ele que
 * acusa combustível faltando no tanque. Ele depende dos litros VENDIDOS do
 * produto, que por sua vez dependem de somar os três bicos de Gasolina Comum —
 * errar esse agrupamento produziria uma perda inventada de ~19 mil litros.
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { resumoCompra, type EntradaCompraProduto } from './resumo-compra';
import { resumoEstoque, type EntradaEstoqueProduto } from './resumo-estoque';
import { despesaOperacionalPorLitro } from './lucro';

const SQLITE = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/**
 * Litros são exatos ao mililitro; a tolerância cobre só ruído da fonte. Era 0,002
 * até 21/09/2026 — e deixava passar +1 mL e a subtração em float cru
 * (`38392 − 29007.79 = 9384.210000000001`). Ruído real medido nos 7 meses:
 * 1,3e-10 L. Meio mililitro já é 4 milhões de vezes isso.
 */
const TOL_LITROS = 0.0005;
/** Litro em mililitro inteiro — o que o módulo promete devolver. */
const aoMl = (litros: number): number => Math.round(litros * 1000) / 1000;
/** R$/L da planilha tem precisão total — casa em 6 decimais. */
const TOL_PRECO = 1e-6;

/**
 * Bico → produto da compra.
 *
 * @remarks O bico 04 é **Diesel S10** (confirmado com o dono em 16/08/2026); o
 *          `Ds:.500` que aparece na aba de resumo é rótulo errado digitado na
 *          planilha, não um segundo produto. Ver `resumo-produto.golden.spec.ts`.
 */
const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

interface LinhaCompraSql {
    produto: string;
    compra_lt: number;
    compra_rs: number;
    media_lt: number;
    valor_venda: number;
}

interface LinhaEstoqueSql {
    produto: string;
    ano_passado: number;
    compra_e_estoque: number;
    estoque_hoje: number;
    perca_sobra: number;
    estoque_tanque: number;
}

const meses = (
    db.query('SELECT DISTINCT mes FROM compra_mensal ORDER BY mes').all() as { mes: number }[]
).map((m) => m.mes);

test('a planilha tem os 7 meses de 2026 no bloco de compra', () => {
    expect(meses).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

/** Litros vendidos por PRODUTO no mês — soma dos bicos daquele produto. */
function litrosVendidosPorProduto(mes: number): Map<string, number> {
    const linhas = db
        .query('SELECT bico, litros FROM resumo_mensal_bico WHERE mes = ?')
        .all(mes) as { bico: string; litros: number }[];

    const mapa = new Map<string, number>();
    for (const l of linhas) {
        const produto = PRODUTO_DO_BICO[l.bico];
        // Soma em mililitro inteiro: é assim que 29.007,79 sai exato, e é esse
        // número que o estoque teórico subtrai.
        const atual = mapa.get(produto) ?? 0;
        mapa.set(produto, (Math.round(atual * 1000) + Math.round(l.litros * 1000)) / 1000);
    }
    return mapa;
}

for (const mes of meses) {
    const compras = db
        .query('SELECT * FROM compra_mensal WHERE mes = ?')
        .all(mes) as LinhaCompraSql[];
    const estoques = db
        .query('SELECT * FROM estoque_mensal WHERE mes = ?')
        .all(mes) as LinhaEstoqueSql[];
    const despesa =
        (db.query('SELECT valor FROM despesa_mensal WHERE mes = ?').get(mes) as
            | { valor: number }
            | undefined)?.valor ?? 0;

    const vendidos = litrosVendidosPorProduto(mes);
    const litrosVendidosMes = [...vendidos.values()].reduce((a, v) => a + v, 0);
    const rateio = despesaOperacionalPorLitro(despesa, litrosVendidosMes);

    // ── Bloco COMPRA ────────────────────────────────────────────────────────
    const entradasCompra: EntradaCompraProduto[] = compras.map((c) => ({
        produto: c.produto,
        litros: c.compra_lt,
        valor: c.compra_rs,
    }));
    const compra = resumoCompra(entradasCompra, rateio, despesa > 0);

    for (const linha of compras) {
        const calculado = compra.produtos.find((p) => p.produto === linha.produto)!;

        test(`mês ${mes} · ${linha.produto}: custo médio de compra bate`, () => {
            expect(calculado.mediaLitro).toBeCloseTo(linha.media_lt, 6);
        });

        test(`mês ${mes} · ${linha.produto}: valor pra venda bate`, () => {
            expect(calculado.valorParaVenda).not.toBeNull();
            expect(Math.abs(calculado.valorParaVenda! - linha.valor_venda)).toBeLessThanOrEqual(
                TOL_PRECO
            );
        });
    }

    // ── Bloco ESTOQUE ───────────────────────────────────────────────────────
    const porProdutoCompra = new Map(compras.map((c) => [c.produto, c]));
    const entradasEstoque: EntradaEstoqueProduto[] = estoques.map((e) => ({
        produto: e.produto,
        estoqueAnterior: e.ano_passado,
        litrosComprados: porProdutoCompra.get(e.produto)?.compra_lt ?? 0,
        litrosVendidos: vendidos.get(e.produto) ?? 0,
        estoqueMedido: e.estoque_tanque,
    }));
    const estoque = resumoEstoque(entradasEstoque);

    for (const linha of estoques) {
        const calculado = estoque.produtos.find((p) => p.produto === linha.produto)!;

        test(`mês ${mes} · ${linha.produto}: compra + estoque bate`, () => {
            expect(Math.abs(calculado.compraEEstoque - linha.compra_e_estoque)).toBeLessThanOrEqual(
                TOL_LITROS
            );
            expect(calculado.compraEEstoque).toBe(aoMl(calculado.compraEEstoque));
        });

        test(`mês ${mes} · ${linha.produto}: estoque teórico bate`, () => {
            expect(Math.abs(calculado.estoqueTeorico - linha.estoque_hoje)).toBeLessThanOrEqual(
                TOL_LITROS
            );
            expect(calculado.estoqueTeorico).toBe(aoMl(calculado.estoqueTeorico));
        });

        test(`mês ${mes} · ${linha.produto}: perca/sobra bate`, () => {
            expect(calculado.percaOuSobra).not.toBeNull();
            expect(Math.abs(calculado.percaOuSobra! - linha.perca_sobra)).toBeLessThanOrEqual(
                TOL_LITROS
            );
            expect(calculado.percaOuSobra).toBe(aoMl(calculado.percaOuSobra!));
        });
    }
}

/**
 * Janeiro/2026 como âncora explícita — os números que o dono confere de cabeça.
 */
test('janeiro/2026: piso de venda e perda de combustível', () => {
    const compras = db
        .query('SELECT * FROM compra_mensal WHERE mes = 1')
        .all() as LinhaCompraSql[];
    const estoques = db
        .query('SELECT * FROM estoque_mensal WHERE mes = 1')
        .all() as LinhaEstoqueSql[];
    const despesa = (db.query('SELECT valor FROM despesa_mensal WHERE mes = 1').get() as {
        valor: number;
    }).valor;

    const vendidos = litrosVendidosPorProduto(1);
    const rateio = despesaOperacionalPorLitro(
        despesa,
        [...vendidos.values()].reduce((a, v) => a + v, 0)
    );

    expect(rateio).toBeCloseTo(0.4730361, 6);

    const compra = resumoCompra(
        compras.map((c) => ({ produto: c.produto, litros: c.compra_lt, valor: c.compra_rs })),
        rateio,
        true
    );
    const comum = compra.produtos.find((p) => p.produto === 'G,Comum.')!;
    expect(comum.mediaLitro).toBeCloseTo(5.3451613, 6);
    expect(comum.valorParaVenda).toBeCloseTo(5.8181974, 6);
    expect(comum.percentualDespesa).toBeCloseTo(8.130286, 4);
    expect(compra.totais.litros).toBeCloseTo(47000, 3);
    expect(compra.totais.valor).toBeCloseTo(241195, 2);

    const estoque = resumoEstoque(
        estoques.map((e) => ({
            produto: e.produto,
            estoqueAnterior: e.ano_passado,
            litrosComprados: compras.find((c) => c.produto === e.produto)?.compra_lt ?? 0,
            litrosVendidos: vendidos.get(e.produto) ?? 0,
            estoqueMedido: e.estoque_tanque,
        }))
    );

    // A comum vendeu 29.007,79 L (três bicos somados) e fechou faltando 3.712,21 L.
    expect(vendidos.get('G,Comum.')).toBeCloseTo(29007.79, 2);
    const comumEstoque = estoque.produtos.find((p) => p.produto === 'G,Comum.')!;
    expect(comumEstoque.compraEEstoque).toBeCloseTo(38392, 3);
    expect(comumEstoque.estoqueTeorico).toBeCloseTo(9384.21, 2);
    expect(comumEstoque.percaOuSobra).toBeCloseTo(-3712.21, 2);
    expect(estoque.temPerda).toBe(true);
    expect(estoque.temProdutoSemMedicao).toBe(false);
    expect(estoque.totais.percaOuSobra).toBeCloseTo(-3565.938, 2);
});
