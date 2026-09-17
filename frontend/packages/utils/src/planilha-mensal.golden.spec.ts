/**
 * Golden master da planilha inteira contra os 7 meses reais de 2026.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`.
 *
 * Os outros goldens provam cada bloco em separado. Este prova a **composição** —
 * que é onde mora o risco de `planilhaMensal`: os três blocos dependem do mesmo
 * `custo do litro`, e o jeito de errar sem ninguém ver é cada bloco calcular o
 * seu. O gabarito que fecha essa porta é o `lucro_bico` da própria planilha:
 * ele só bate se preço, custo médio de compra e rateio da despesa estiverem
 * todos certos **ao mesmo tempo**, com o rateio dividido pelos litros vendidos
 * do mês — não pelos comprados.
 *
 * Colunas da planilha usadas como gabarito, todas leitura direta de célula:
 *
 * - `resumo_mensal_bico.litros`     → `LinhaBico.litros`
 * - `resumo_mensal_bico.venda`      → `LinhaBico.venda`
 * - `resumo_mensal_bico.lucro_bico` → `LinhaBico.lucro`      ← a corrente inteira
 * - `compra_mensal.media_lt`        → `LinhaCompra.mediaLitro`
 * - `compra_mensal.valor_venda`     → `LinhaCompra.valorParaVenda`
 * - `estoque_mensal.compra_e_estoque` → `LinhaEstoque.compraEEstoque`
 * - `estoque_mensal.estoque_hoje`     → `LinhaEstoque.estoqueTeorico`
 * - `estoque_mensal.perca_sobra`      → `LinhaEstoque.percaOuSobra`
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { planilhaMensal, type EntradaBicoPlanilha, type EntradaProdutoPlanilha } from './planilha-mensal';

const SQLITE = `${import.meta.dir}/../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Litros são exatos ao mililitro; a tolerância cobre só ruído de float da fonte. */
const TOL_LITROS = 0.002;
/** Dinheiro: o módulo quantiza em centavos, a planilha não. */
const TOL_REAIS = 0.02;
/** R$/L da planilha tem precisão total. */
const TOL_PRECO = 1e-6;

/**
 * Bico → produto.
 *
 * @remarks O bico 04 é **Diesel S10**; o `Ds:.500` da aba de resumo é rótulo
 *          errado digitado na planilha, não um segundo produto. Mesmo
 *          mapeamento de `resumo-compra-estoque.golden.spec.ts` — se um dia
 *          divergirem, é sinal de que alguém mudou um dos dois sozinho.
 */
const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

interface BicoSql {
    bico: string;
    inicial: number;
    fechamento: number;
    litros: number;
    valor_lt: number | null;
    venda: number;
    lucro_bico: number;
}

interface CompraSql {
    produto: string;
    compra_lt: number;
    compra_rs: number;
    media_lt: number;
    valor_venda: number;
}

interface EstoqueSql {
    produto: string;
    ano_passado: number;
    compra_e_estoque: number;
    estoque_hoje: number;
    perca_sobra: number;
    estoque_tanque: number;
}

const meses = db
    .query('select distinct ano, mes from resumo_mensal_bico order by ano, mes')
    .all() as { ano: number; mes: number }[];

for (const { ano, mes } of meses) {
    const rotulo = `${String(mes).padStart(2, '0')}/${ano}`;

    const bicosSql = db
        .query('select * from resumo_mensal_bico where ano = ? and mes = ? order by bico')
        .all(ano, mes) as BicoSql[];
    const compraSql = db
        .query('select * from compra_mensal where ano = ? and mes = ?')
        .all(ano, mes) as CompraSql[];
    const estoqueSql = db
        .query('select * from estoque_mensal where ano = ? and mes = ?')
        .all(ano, mes) as EstoqueSql[];
    const despesa = (
        db.query('select valor from despesa_mensal where ano = ? and mes = ?').get(ano, mes) as
            | { valor: number }
            | undefined
    )?.valor ?? 0;

    /**
     * Preço do produto, não do bico.
     *
     * @remarks A planilha deixa `valor_lt` **em branco** nos bicos repetidos do
     *          mesmo produto — o Bico 06 tem a célula vazia porque vende a mesma
     *          gasolina do 01. Ler o preço por bico daria `null` ali e zeraria a
     *          venda de um bico que faturou R$ 12 mil.
     */
    const precoDoProduto = new Map<string, number>();
    for (const b of bicosSql) {
        const produto = PRODUTO_DO_BICO[b.bico];
        if (b.valor_lt !== null && !precoDoProduto.has(produto)) {
            precoDoProduto.set(produto, b.valor_lt);
        }
    }

    const estoquePorProduto = new Map(estoqueSql.map((e) => [e.produto, e]));

    const entradaBicos: EntradaBicoPlanilha[] = bicosSql.map((b) => ({
        bico: b.bico,
        produto: PRODUTO_DO_BICO[b.bico],
        inicial: b.inicial,
        fechamento: b.fechamento,
    }));

    const entradaProdutos: EntradaProdutoPlanilha[] = compraSql.map((c) => {
        const e = estoquePorProduto.get(c.produto);
        return {
            produto: c.produto,
            preco: precoDoProduto.get(c.produto) ?? 0,
            compraLitros: c.compra_lt,
            compraValor: c.compra_rs,
            estoqueAnterior: e?.ano_passado ?? 0,
            estoqueTanque: e?.estoque_tanque ?? null,
        };
    });

    const apurado = planilhaMensal({
        bicos: entradaBicos,
        produtos: entradaProdutos,
        despesasDoMes: despesa,
    });

    // ── Venda: litros, faturamento e — o que fecha a corrente — lucro ────────
    bicosSql.forEach((esperado, i) => {
        const obtido = apurado.venda.bicos[i];

        test(`${rotulo} · ${esperado.bico} · litros`, () => {
            expect(Math.abs(obtido.litros - esperado.litros)).toBeLessThan(TOL_LITROS);
        });

        test(`${rotulo} · ${esperado.bico} · venda`, () => {
            expect(Math.abs(obtido.venda - esperado.venda)).toBeLessThan(TOL_REAIS);
        });

        // Só passa se preço, custo médio de compra e rateio da despesa
        // estiverem certos ao mesmo tempo. É o teste que prova a composição.
        test(`${rotulo} · ${esperado.bico} · lucro do bico`, () => {
            expect(obtido.apurado).toBe(true);
            expect(Math.abs(obtido.lucro - esperado.lucro_bico)).toBeLessThan(TOL_REAIS);
        });
    });

    // ── Compra: média por litro e piso de venda ─────────────────────────────
    compraSql.forEach((esperado, i) => {
        const obtido = apurado.compra.produtos[i];

        test(`${rotulo} · ${esperado.produto} · média LT`, () => {
            expect(Math.abs((obtido.mediaLitro as number) - esperado.media_lt)).toBeLessThan(
                TOL_PRECO
            );
        });

        test(`${rotulo} · ${esperado.produto} · valor para venda`, () => {
            expect(
                Math.abs((obtido.valorParaVenda as number) - esperado.valor_venda)
            ).toBeLessThan(TOL_PRECO);
        });
    });

    // ── Estoque: o número que acusa combustível faltando ────────────────────
    compraSql.forEach((c, i) => {
        const esperado = estoquePorProduto.get(c.produto);
        if (!esperado) return;
        const obtido = apurado.estoque.produtos[i];

        test(`${rotulo} · ${c.produto} · compra + estoque`, () => {
            expect(Math.abs(obtido.compraEEstoque - esperado.compra_e_estoque)).toBeLessThan(
                TOL_LITROS
            );
        });

        test(`${rotulo} · ${c.produto} · estoque hoje`, () => {
            expect(Math.abs(obtido.estoqueTeorico - esperado.estoque_hoje)).toBeLessThan(
                TOL_LITROS
            );
        });

        test(`${rotulo} · ${c.produto} · perca e sobra`, () => {
            expect(Math.abs((obtido.percaOuSobra as number) - esperado.perca_sobra)).toBeLessThan(
                TOL_LITROS
            );
        });
    });

    // ── O rateio é UM só, e é ele que liga os três blocos ───────────────────
    test(`${rotulo} · o custo do litro é o mesmo nos três blocos`, () => {
        expect(apurado.compra.despesaPorLitro).toBe(apurado.custoPorLitro);
        expect(apurado.venda.totais.despesaPorLitro).toBe(apurado.custoPorLitro);
    });

    // ── Margem bruta menos despesa é o lucro líquido, pela distributiva ─────
    test(`${rotulo} · margem bruta − despesa do mês = lucro líquido`, () => {
        expect(Math.abs(apurado.margemBruta - despesa - apurado.lucroLiquido)).toBeLessThan(0.5);
    });
}
