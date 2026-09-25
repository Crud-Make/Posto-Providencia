/**
 * Golden do lucro operacional dos insights de IA (sítio 3.7) sobre julho/2026
 * (`docs/data/posto_jorro_2026.sqlite`).
 *
 * [onda 3, grupo B] O insight foi CONSOLIDADO: `lucroOperacionalDoMes(lucro
 * bruto, despesas)` reproduz o lucro real do mês — a mesma fórmula do painel
 * do proprietário (`lucro-real.golden.spec.ts`). O ANTES está documentado
 * aqui em números: a conta aposentada (`vendas − despesas`, sem custo de
 * produto) mostrava R$ 189.312,05 onde o real é R$ 18.272,31 — mais de 10×,
 * porque ignorava R$ 171.039,74 de custo de produto.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, emCentavos, lucroCombustivel, somarDespesas } from '@posto/utils';
import { lucroOperacionalDoMes } from './calculos-saude-financeira';

const SQLITE = `${import.meta.dir}/../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

test('julho: lucroOperacionalDoMes(bruto, despesas) = lucro real — antes a conta mostrava 10×', () => {
    const bicos = db
        .query('SELECT bico, litros, valor_lt, venda FROM resumo_mensal_bico WHERE ano=2026 AND mes=7')
        .all() as { bico: string; litros: number; valor_lt: number | null; venda: number }[];
    const custos = new Map(
        (
            db
                .query('SELECT produto, media_lt FROM compra_mensal WHERE ano=2026 AND mes=7')
                .all() as { produto: string; media_lt: number }[]
        ).map((c) => [c.produto, c.media_lt])
    );
    const despesa = somarDespesas(
        db
            .query('SELECT categoria, valor FROM despesa_lancada WHERE ano=2026 AND mes=7')
            .all() as { categoria: string | null; valor: number | null }[]
    );

    const litrosTotal = bicos.reduce((s, b) => s + b.litros, 0);
    const totalVendas = bicos.reduce(
        (s, b) => s + b.litros * (b.valor_lt ?? b.venda / b.litros),
        0
    );
    const custoProduto = bicos.reduce(
        (s, b) => s + b.litros * custos.get(PRODUTO_DO_BICO[b.bico])!,
        0
    );

    // O que a RPC get_dashboard_proprietario devolve para julho: o lucro BRUTO
    // (receita − custo da época), sem taxa e sem despesa.
    const lucroBruto = totalVendas - custoProduto;
    expect(lucroBruto).toBeCloseTo(36_858.07, 1);

    // A conta REAL do insight hoje: bruto − despesas do período.
    const doInsight = lucroOperacionalDoMes(lucroBruto, despesa);
    expect(doInsight).toBeCloseTo(18_272.31, 1); // = LUCRO_REAL_ESPERADO[7] do golden lucro-real

    // …que é o mesmo lucro canônico bico a bico, com a despesa rateada por litro.
    const despLt = despesaOperacionalPorLitro(despesa, litrosTotal);
    const canonico = bicos.reduce(
        (s, b) =>
            s +
            lucroCombustivel({
                litros: b.litros,
                precoVenda: b.valor_lt ?? b.venda / b.litros,
                custoMedio: custos.get(PRODUTO_DO_BICO[b.bico])!,
                despesaOperacionalLitro: despLt,
            }),
        0
    );
    // Exatidão, não folga: `toBeCloseTo(_, 1)` tolera CINCO CENTAVOS, e medido
    // por mutação em 20/09 isso deixava passar tanto a soma em float quanto um
    // centavo deslocado. A saída é dinheiro e nasce quantizada — então iguala-se
    // ao canônico quantizado, sem arredondar o lado do módulo.
    expect(doInsight).toBe(emCentavos(canonico));

    // O ANTES, em números: vendas − despesas (o modelo aposentado) mostrava
    // R$ 189.312,05 — o custo de produto inteiro (R$ 171.039,74) virava "lucro".
    const antes = totalVendas - despesa;
    expect(antes).toBeCloseTo(189_312.05, 1);
    expect(antes - doInsight).toBeCloseTo(custoProduto, 0);
    expect(custoProduto).toBeCloseTo(171_039.74, 1);
    expect(antes / doInsight).toBeGreaterThan(10);
});
