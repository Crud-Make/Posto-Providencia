/**
 * Golden master do LUCRO contra dado real do mês 01 (planilha Posto Jorro 2026).
 *
 * Fonte: docs/data/fixture_lucro_custo_mes01.json (extraído da planilha).
 * Roda sob `bun test` (JSON import nativo); vitest ignora (*.spec.ts).
 *
 * ⚠️ CAVEATS IMPORTANTES (limites deste golden — leia antes de confiar cegamente):
 *
 * 1. GRANULARIDADE MENSAL, não diária. A aba de venda diária não tem coluna de
 *    custo — lucro/margem só existem na aba de resumo mensal por produto. Então,
 *    diferente do janeiro_referencia.sqlite (que valida dia a dia), este golden
 *    valida "o MÊS 01 inteiro bate com isso" — granularidade mais grossa, e tudo
 *    bem: é o que a planilha real oferece.
 *
 * 2. TAXA DE CARTÃO NÃO ESTÁ PREENCHIDA no mês 01 real (categoria existe na
 *    planilha, valor = null). Logo, este teste passa MESMO QUE o código não some
 *    taxa de cartão nenhuma neste mês — o que NÃO prova que a lógica de somar
 *    taxa (como item de despesa mensal) está certa, só que não há dado para
 *    contradizê-la. Este golden NÃO cobre o caso "taxa de cartão preenchida".
 */
import { test, expect } from 'bun:test';
import fixture from '../../../docs/data/fixture_lucro_custo_mes01.json';
import {
    despesaOperacionalPorLitro,
    lucroCombustivel,
    margemPercentual,
    custoMedioCompra,
} from './lucro';

// Custo médio de compra recalculado a partir da compra crua (litros/valor) do
// mês bate com o `media_lt_rs` da planilha — é o que `custoMedioCompra`
// substitui: a margem % hardcoded por tipo de combustível que o app tinha em
// `useCalculoGestaoBicos.ts` (ver .claude/agent-memory/planilha para a
// divergência medida: até 67% de erro no lucro do Diesel).
for (const c of fixture.mes_01_compra_custo_estoque) {
    test(`custoMedioCompra recalcula o custo médio real — ${c.produto}`, () => {
        const custo = custoMedioCompra([{ litros: c.compra_lt, valorTotal: c.compra_rs }]);
        expect(custo).not.toBeNull();
        expect(Math.abs((custo as number) - c.media_lt_rs)).toBeLessThan(1e-9);
    });
}

test('custoMedioCompra devolve null sem compra no período (nunca 0)', () => {
    expect(custoMedioCompra([])).toBeNull();
    expect(custoMedioCompra([{ litros: 0, valorTotal: 0 }])).toBeNull();
});

const TOL = 1.0; // R$ 1,00 de tolerância (arredondamentos de custo/rateio na planilha)

// Custo médio de compra por produto (aba compra/custo do mês 01).
const custoPorProduto: Record<string, number> = {};
for (const c of fixture.mes_01_compra_custo_estoque) {
    custoPorProduto[c.produto] = c.media_lt_rs;
}
const custoDoBico = (produto: string): number => {
    if (produto.startsWith('G,C')) return custoPorProduto['G,Comum.'];
    if (produto.startsWith('G,A')) return custoPorProduto['G,Aditivada.'];
    if (produto.startsWith('Etanol')) return custoPorProduto['Etanol.'];
    if (produto.startsWith('Ds')) return custoPorProduto['Ds.10.'];
    throw new Error(`produto sem custo mapeado: ${produto}`);
};

// Despesa operacional por litro rateada no mês (inclui taxa de cartão SE lançada;
// no mês 01 a taxa é null → não entra — ver CAVEAT 2).
const despOp = despesaOperacionalPorLitro(
    fixture.mes_01_despesas_total_rs,
    fixture.mes_01_total.litros_vendidos
);

test('despesa operacional por litro = despesas_mês / litros_mês (planilha H22=H19/F11)', () => {
    expect(Math.abs(despOp - fixture.mes_01_despesa_operacional_por_litro_rs)).toBeLessThan(1e-6);
});

// Lucro por bico bate com a planilha.
for (const b of fixture.mes_01_por_produto) {
    test(`lucro do bico bate com a planilha — ${b.produto}`, () => {
        // Bico 06 tem valor_lt nulo na planilha; derivo o preço de venda/litro.
        const precoVenda = b.valor_lt_rs ?? b.venda_bico_rs / b.litros;
        const lucro = lucroCombustivel({
            litros: b.litros,
            precoVenda,
            custoMedio: custoDoBico(b.produto),
            despesaOperacionalLitro: despOp,
        });
        expect(Math.abs(lucro - b.lucro_bico_rs)).toBeLessThan(TOL);
    });
}

test('lucro total do mês bate com a planilha', () => {
    const lucroTotal = fixture.mes_01_por_produto.reduce((acc, b) => {
        const precoVenda = b.valor_lt_rs ?? b.venda_bico_rs / b.litros;
        return acc + lucroCombustivel({
            litros: b.litros,
            precoVenda,
            custoMedio: custoDoBico(b.produto),
            despesaOperacionalLitro: despOp,
        });
    }, 0);
    expect(Math.abs(lucroTotal - fixture.mes_01_total.lucro_total_rs)).toBeLessThan(TOL);
});

test('margem = lucro_total / venda_total (definição padrão)', () => {
    // NOTA DE CONVENÇÃO: o campo `margem_media_pct` do fixture (~10,85%) usa
    // razão-de-médias (lucro_médio_lt / preço_médio_lt), não lucro/venda. Nosso
    // módulo usa a definição padrão (lucro_total / venda_total ≈ 10,36%), que é a
    // mesma de fechamento.service (lucro_bruto/receita_bruta). Validamos contra
    // ESSA definição, derivada dos totais reais — não contra a razão-de-médias.
    const esperado =
        (fixture.mes_01_total.lucro_total_rs / fixture.mes_01_total.venda_total_rs) * 100;
    const margem = margemPercentual(
        fixture.mes_01_total.lucro_total_rs,
        fixture.mes_01_total.venda_total_rs
    );
    expect(Math.abs(margem - esperado)).toBeLessThan(1e-9);
});
