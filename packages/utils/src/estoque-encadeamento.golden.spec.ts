/**
 * Golden master do ENCADEAMENTO de estoque entre meses, e da divergência entre
 * as duas fórmulas de custo que o sistema tem hoje.
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
import { custoMedioPonderado } from './custo-ponderado';

const SQLITE = `${import.meta.dir}/../../../docs/data/posto_jorro_2026.sqlite`;
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

// ── 3. As duas fórmulas de custo ────────────────────────────────────────────

/**
 * A média ponderada do caminho de ESCRITA — agora a função de PRODUÇÃO.
 *
 * @remarks Até a onda 2 este bloco era uma RÉPLICA da conta de
 *          `compra.service.ts`, porque `packages/*` não pode importar de
 *          `apps/*` (§2) — e réplica fica verde quando o original muda. A
 *          fórmula subiu para `custo-ponderado.ts` (MOVE, mesma conta) e o
 *          serviço passou a chamá-la: mexeu no custo do caminho de escrita,
 *          este golden VÊ. Detalhe de arqueologia: a réplica antiga fazia
 *          `Math.max(estoque, 0)` e caía no custo ANTERIOR com denominador
 *          zero — duas bordas que a produção nunca teve. No dado real de 2026
 *          nada as exercita e os números abaixo não mudaram na migração; as
 *          bordas de produção estão congeladas em `custo-ponderado.test.ts`.
 */
const custoPonderado = (
    estoqueAnterior: number,
    custoAnterior: number,
    litrosCompra: number,
    valorCompra: number
): number =>
    custoMedioPonderado({
        estoqueAnterior,
        custoMedioAnterior: custoAnterior,
        litrosCompra,
        custoLitroCompra: litrosCompra > 0 ? valorCompra / litrosCompra : 0,
    });

/**
 * Impacto da troca de fórmula no custo do mês, em reais.
 * Positivo = o ponderado superestima o custo, logo subestima o lucro.
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

const PRODUTO_DO_BICO: Readonly<Record<string, string>> = {
    'G,C. Bico 01': 'G,Comum.',
    'G,C, Bico 05': 'G,Comum.',
    'G,C. Bico 06': 'G,Comum.',
    'G,A.Bico 02': 'G,Aditivada.',
    'Etanol,Bico 03': 'Etanol.',
    'Ds:.500,Bico 04': 'Ds.10.',
};

function litrosVendidosPorProduto(mes: number): Map<string, number> {
    const linhas = db
        .query('SELECT bico, litros FROM resumo_mensal_bico WHERE mes = ?')
        .all(mes) as { bico: string; litros: number }[];
    const mapa = new Map<string, number>();
    for (const l of linhas) {
        const produto = PRODUTO_DO_BICO[l.bico];
        const atual = mapa.get(produto) ?? 0;
        mapa.set(produto, (Math.round(atual * 1000) + Math.round(l.litros * 1000)) / 1000);
    }
    return mapa;
}

test('a planilha custeia pela compra do próprio mês, sem estoque anterior', () => {
    // `media_lt` da fonte é exatamente compra_rs ÷ compra_lt em todos os meses.
    // É a prova de que o estoque anterior NÃO entra no custo — que é o ponto em
    // que o caminho de escrita diverge.
    const linhas = db
        .query('SELECT mes, produto, compra_lt, compra_rs, media_lt FROM compra_mensal')
        .all() as { mes: number; produto: string; compra_lt: number; compra_rs: number; media_lt: number }[];

    expect(linhas.length).toBe(28);
    for (const l of linhas) {
        expect(l.media_lt).toBeCloseTo(l.compra_rs / l.compra_lt, 9);
    }
});

test('divergência conhecida: o custo ponderado erra o lucro do mês em até R$ 2.582', () => {
    const custoCorrente = new Map<string, number>();
    let acumulado = 0;

    for (const mes of [1, 2, 3, 4, 5, 6, 7]) {
        const compras = db
            .query('SELECT produto, compra_lt, compra_rs, media_lt FROM compra_mensal WHERE mes = ?')
            .all(mes) as { produto: string; compra_lt: number; compra_rs: number; media_lt: number }[];
        const estoques = new Map(estoqueDoMes(mes).map((l) => [l.produto, l]));
        const vendidos = litrosVendidosPorProduto(mes);

        let impactoMes = 0;
        for (const c of compras) {
            const anterior = custoCorrente.get(c.produto) ?? c.media_lt;
            const ponderado = custoPonderado(
                estoques.get(c.produto)!.ano_passado,
                anterior,
                c.compra_lt,
                c.compra_rs
            );
            custoCorrente.set(c.produto, ponderado);
            impactoMes += (ponderado - c.media_lt) * (vendidos.get(c.produto) ?? 0);
        }

        expect(impactoMes).toBeCloseTo(IMPACTO_MENSAL[mes], 1);
        acumulado += impactoMes;
    }

    // No ano as duas fórmulas quase empatam — R$ 132,69 sobre R$ 1.541.032
    // comprados. É por isso que a divergência passou despercebida: só aparece
    // quando se olha o mês, que é justamente o que o dono olha.
    expect(acumulado).toBeCloseTo(132.69, 1);
});
