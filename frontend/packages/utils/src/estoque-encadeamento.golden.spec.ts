/**
 * Golden master do ENCADEAMENTO de estoque entre meses.
 *
 * [06/09/2026] A seção 3 ("as duas fórmulas de custo") saiu junto com
 * `custoMedioPonderado`: a fórmula legada não tem mais consumidor de produção
 * desde o #80. A prova da divergência (até R$ 2.582/mês) vive em
 * `apps/web/src/services/api/calculos-analise-vendas.golden.spec.ts`, que a
 * mede atravessando a função de produção da tela. Fica aqui o que era de
 * estoque — e a prova documental de que a planilha custeia pela compra do mês.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`.
 *
 * O `resumo-compra-estoque.golden.spec.ts` prova cada mês **isolado**: dado um
 * estoque anterior, o teórico e a perda saem certos. Ele não olha de onde vem
 * esse estoque anterior — e é exatamente aí que a planilha real erra. Um mês
 * pode fechar perfeito contra a célula da planilha e ainda assim partir de um
 * saldo inicial que não é o do mês passado.
 *
 * Duas coisas ficam travadas aqui:
 *
 * 1. **A regra da corrente** — `estoque_anterior[m] = estoque_tanque[m−1]`, o
 *    litro MEDIDO na régua, nunca o teórico. Vale de março a julho.
 *
 * 2. **A quebra conhecida de fevereiro** — fevereiro repetiu o `ano_passado` de
 *    janeiro em vez de herdar o medido. Está errado na PLANILHA, não no código,
 *    e por isso é documentado como divergência (§7 do CLAUDE.md) em vez de
 *    "consertado" aqui. Se um dia a planilha for corrigida na origem, este teste
 *    quebra — e quebrar é o comportamento certo: quer dizer que a fonte mudou.
 *
 * @remarks A perda de fevereiro é o motivo de isso importar. Com o saldo errado,
 *          a Aditivada acusa −2.070,25 L sumidos num mês em que a corrente certa
 *          daria outro número. Perda de combustível aponta o dedo para gente.
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';

const SQLITE = `${import.meta.dir}/../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Litros são exatos ao mililitro; a tolerância cobre só ruído da fonte. */
const TOL_LITROS = 0.002;

interface LinhaEstoque {
    produto: string;
    ano_passado: number;
    estoque_tanque: number;
}

const estoqueDoMes = (mes: number): LinhaEstoque[] =>
    db
        .query('SELECT produto, ano_passado, estoque_tanque FROM estoque_mensal WHERE mes = ? ORDER BY produto')
        .all(mes) as LinhaEstoque[];

// ── 1. A regra da corrente ──────────────────────────────────────────────────

for (const mes of [3, 4, 5, 6, 7]) {
    const atual = estoqueDoMes(mes);
    const anterior = new Map(estoqueDoMes(mes - 1).map((l) => [l.produto, l]));

    for (const linha of atual) {
        test(`mês ${mes} · ${linha.produto}: estoque anterior é o tanque medido do mês ${mes - 1}`, () => {
            const medidoAntes = anterior.get(linha.produto);
            expect(medidoAntes).toBeDefined();
            expect(Math.abs(linha.ano_passado - medidoAntes!.estoque_tanque)).toBeLessThanOrEqual(
                TOL_LITROS
            );
        });
    }
}

// ── 2. A quebra conhecida de fevereiro ──────────────────────────────────────

/**
 * Deltas exatos entre o que fevereiro herdou e o que janeiro mediu, em litros.
 * Positivo = fevereiro partiu de mais combustível do que havia no tanque.
 */
const QUEBRA_FEVEREIRO: Readonly<Record<string, number>> = {
    'Ds.10.': 381,
    'Etanol.': -879,
    'G,Aditivada.': 2187,
    'G,Comum.': 1720,
};

test('fevereiro/2026 NÃO herda o tanque medido de janeiro — divergência da planilha', () => {
    const fevereiro = estoqueDoMes(2);
    const janeiro = new Map(estoqueDoMes(1).map((l) => [l.produto, l]));

    for (const linha of fevereiro) {
        const medidoEmJaneiro = janeiro.get(linha.produto)!;
        const delta = linha.ano_passado - medidoEmJaneiro.estoque_tanque;
        expect(delta).toBeCloseTo(QUEBRA_FEVEREIRO[linha.produto], 3);
    }
});

test('fevereiro repetiu literalmente o saldo de abertura de janeiro', () => {
    const fevereiro = estoqueDoMes(2);
    const janeiro = new Map(estoqueDoMes(1).map((l) => [l.produto, l]));

    // Não é um valor qualquer errado: é o `ano_passado` de janeiro, copiado.
    for (const linha of fevereiro) {
        expect(linha.ano_passado).toBeCloseTo(janeiro.get(linha.produto)!.ano_passado, 3);
    }
});

// ── 3. A planilha custeia pela compra do próprio mês ────────────────────────

test('a planilha custeia pela compra do próprio mês, sem estoque anterior', () => {
    // `media_lt` da fonte é exatamente compra_rs ÷ compra_lt em todos os meses.
    // É a prova de que o estoque anterior NÃO entra no custo — que é o ponto em
    // que o caminho de escrita (a média ponderada, já apagada) divergia.
    const linhas = db
        .query('SELECT mes, produto, compra_lt, compra_rs, media_lt FROM compra_mensal')
        .all() as { mes: number; produto: string; compra_lt: number; compra_rs: number; media_lt: number }[];

    expect(linhas.length).toBe(28);
    for (const l of linhas) {
        expect(l.media_lt).toBeCloseTo(l.compra_rs / l.compra_lt, 9);
    }
});
