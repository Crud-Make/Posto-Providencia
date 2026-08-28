/**
 * Golden do "Saldo Operacional" dos insights de IA (sítio 3.7) contra a
 * canônica, sobre julho/2026 (`docs/data/posto_jorro_2026.sqlite`).
 *
 * A conta é `vendas − despesas`, sem o custo do produto — e combustível tem
 * ~82% de custo sobre a venda. Congelado em 28/08/2026, julho:
 *
 *   saldo "Simplificado" ... R$ 189.312,05
 *   lucro real canônico .... R$  18.272,31  (golden `lucro-real`)
 *   custo de produto ....... R$ 171.039,74  — a diferença, exatamente
 *
 * Mais de 10× o lucro verdadeiro sustentando o insight "Saúde Financeira
 * Estável". Divergência documentada (§7); a consolidação é a onda 3.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, lucroCombustivel, somarDespesas } from '@posto/utils';
import { saldoOperacionalSimplificado } from './calculos-saude-financeira';

const SQLITE = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

test('julho: o saldo "Simplificado" mostra 10× o lucro real — a diferença é o custo do produto', () => {
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
    const despLt = despesaOperacionalPorLitro(despesa, litrosTotal);

    // A conta REAL do insight.
    const simplificado = saldoOperacionalSimplificado(totalVendas, despesa);

    // O lucro canônico do mesmo mês, bico a bico.
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

    expect(simplificado).toBeCloseTo(189_312.05, 1);
    expect(canonico).toBeCloseTo(18_272.31, 1); // = LUCRO_REAL_ESPERADO[7] do golden lucro-real

    // A diferença é EXATAMENTE o custo de produto que a conta ignora.
    const custoProduto = bicos.reduce(
        (s, b) => s + b.litros * custos.get(PRODUTO_DO_BICO[b.bico])!,
        0
    );
    expect(simplificado - canonico).toBeCloseTo(custoProduto, 0);
    expect(custoProduto).toBeCloseTo(171_039.74, 1);

    // Ordem de grandeza que faz o insight mentir: mais de 10× o lucro real.
    expect(simplificado / canonico).toBeGreaterThan(10);
});
