/**
 * Golden master do CUSTO HISTÓRICO — trava o lucro bruto dos 7 meses de 2026
 * apurado com o custo de aquisição DA ÉPOCA de cada mês.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`. Roda sob `bun test`; vitest ignora.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * O BUG QUE ESTE GOLDEN EXISTE PARA IMPEDIR QUE VOLTE (medido em 02/08/2026).
 *
 * A RPC `get_dashboard_proprietario` calculava o lucro assim:
 *
 *     SUM(l.litros_vendidos * (l.preco_litro - c.preco_custo))
 *     JOIN "Combustivel" c ON l.combustivel_id = c.id
 *
 * `Combustivel.preco_custo` é UM valor por combustível, sem histórico: guarda o
 * custo do último mês carregado. Sobre as vendas de janeiro ele aplicava o custo
 * de julho. Erro medido, por mês, contra o custo da época:
 *
 *     jan −16.983,35 | fev −13.386,16 | mar +3.626,69 | abr +14.401,34
 *     mai  +6.366,91 | jun  +2.028,21 | jul      0,00
 *
 * Julho dava zero porque o cadastro guardava exatamente os preços de julho — o
 * mês corrente sempre acerta, e por isso o defeito sobreviveu. O erro TROCA DE
 * SINAL: jan/fev apareciam com lucro menor que o real, mar–jun com lucro maior.
 * Não há viés constante, então não dava para "descontar mentalmente".
 *
 * A correção (migration `20260802_rpc_custo_historico`) lê o custo de `Compra`
 * do mesmo mês da leitura, caindo para `Combustivel.preco_custo` quando o mês não
 * tem compra lançada.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * QUAL CUSTO — decidido contra as fórmulas do .xlsx em 02/08/2026:
 *
 *   `compra_mensal.media_lt` .... `compra_rs / compra_lt`, aquisição PURA.  ← este
 *   `compra_mensal.valor_venda` . `media_lt + despesa_do_mês ÷ litros_do_mês`.
 *
 * Este golden trava o lucro **BRUTO** (com `media_lt`), porque é o que a RPC deve
 * devolver: quem desconta a despesa é `montarResumoDoMes`, depois. Travar aqui o
 * `valor_venda` faria a despesa ser descontada duas vezes — o mesmo erro de 97,7%
 * corrigido em 31/07.
 *
 * ⚠️ FRAGILIDADE HERDADA, travada de propósito: o custo do mês sai só das compras
 * DAQUELE mês. A planilha não valoriza estoque em reais (controla só em litros),
 * então nada pondera o que sobrou do mês anterior. Em fevereiro o Diesel tem
 * compra de 1 litro por R$ 5,00, e esse R$ 5,00/L vira o custo de ~1.515 L
 * vendidos. O número de fevereiro abaixo JÁ INCLUI essa distorção — ele reproduz
 * a planilha, não a corrige. Se um dia o custo passar a ponderar estoque, este
 * teste quebra e alguém decide de novo, em vez de o número escorregar em silêncio.
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';

const SQLITE = `${import.meta.dir}/../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Dinheiro arredonda ao centavo por bico; R$ 0,05 cobre o acúmulo em 6 bicos. */
const TOL = 0.05;

/** Rótulo do bico na planilha -> `combustivel_id` em produção. */
const BICO_COMBUSTIVEL: Readonly<Record<string, number>> = {
    'G,C. Bico 01': 1,
    'G,A.Bico 02': 2,
    'Etanol,Bico 03': 3,
    'DS:.10,Bico 04': 4,
    'G,C, Bico 05': 1,
    'G,C. Bico 06': 1,
};

/** Produto da planilha -> `combustivel_id` em produção. */
const PRODUTO_COMBUSTIVEL: Readonly<Record<string, number>> = {
    'G,Comum.': 1,
    'G,Aditivada.': 2,
    'Etanol.': 3,
    'Ds.10.': 4,
};

/**
 * Lucro bruto esperado por mês: receita real dos encerrantes menos os litros
 * vendidos ao custo de aquisição DAQUELE mês.
 *
 * @remarks Julho (36.858,07) confere com os 36.858,09 já fixados em
 *          `useDashboardProprietario.test.ts` — 2 centavos de arredondamento, e a
 *          prova de que a correção não mexe no mês que já estava certo.
 */
const ESPERADO: Readonly<Record<number, { receita: number; custo: number; lucroBruto: number }>> = {
    1: { receita: 290062.92, custo: 241267.16, lucroBruto: 48795.76 },
    2: { receita: 184195.77, custo: 149401.25, lucroBruto: 34794.53 },
    3: { receita: 288250.96, custo: 233419.28, lucroBruto: 54831.68 },
    4: { receita: 314514.15, custo: 251816.70, lucroBruto: 62697.45 },
    5: { receita: 289030.33, custo: 233778.67, lucroBruto: 55251.66 },
    6: { receita: 287036.32, custo: 233513.58, lucroBruto: 53522.74 },
    7: { receita: 207897.81, custo: 171039.74, lucroBruto: 36858.07 },
};

/**
 * O custo de julho no cadastro é o mesmo da planilha — a coincidência que
 * escondeu o bug. Travado para que, se alguém atualizar `Combustivel.preco_custo`
 * sem carregar a `Compra` do mês novo, a explicação continue registrada aqui.
 */
const CUSTO_JULHO_NO_CADASTRO: Readonly<Record<number, number>> = {
    1: 5.802,
    2: 5.845,
    3: 3.706,
    4: 6.19,
};

interface LinhaEncerrante {
    bico: string;
    litros: number;
    venda_bico: number;
}

function custoDoMes(mes: number): Record<number, number> {
    const linhas = db
        .query('SELECT produto, media_lt FROM compra_mensal WHERE ano = 2026 AND mes = ?')
        .all(mes) as { produto: string; media_lt: number }[];

    const porCombustivel: Record<number, number> = {};
    for (const { produto, media_lt } of linhas) {
        const id = PRODUTO_COMBUSTIVEL[produto];
        if (id === undefined) throw new Error(`produto sem mapeamento: ${produto}`);
        porCombustivel[id] = media_lt;
    }
    return porCombustivel;
}

function apurar(mes: number): { receita: number; custo: number; lucroBruto: number } {
    const custo = custoDoMes(mes);
    const linhas = db
        .query(
            `SELECT bico, litros, venda_bico FROM encerrante_diario
             WHERE ano = 2026 AND mes = ? AND dado_incompleto = 0 AND litros IS NOT NULL`
        )
        .all(mes) as LinhaEncerrante[];

    let receita = 0;
    let custoTotal = 0;
    for (const linha of linhas) {
        const combustivel = BICO_COMBUSTIVEL[linha.bico];
        if (combustivel === undefined) throw new Error(`bico sem mapeamento: ${linha.bico}`);
        receita += linha.venda_bico ?? 0;
        custoTotal += linha.litros * custo[combustivel];
    }
    return { receita, custo: custoTotal, lucroBruto: receita - custoTotal };
}

for (const mes of [1, 2, 3, 4, 5, 6, 7] as const) {
    test(`lucro bruto com custo da época — mês ${String(mes).padStart(2, '0')}`, () => {
        const apurado = apurar(mes);
        const esperado = ESPERADO[mes];

        expect(apurado.receita).toBeCloseTo(esperado.receita, 1);
        expect(apurado.custo).toBeCloseTo(esperado.custo, 1);
        expect(Math.abs(apurado.lucroBruto - esperado.lucroBruto)).toBeLessThan(TOL);
    });
}

test('o custo do cadastro é o de julho — a coincidência que escondeu o bug', () => {
    const julho = custoDoMes(7);
    for (const [id, esperado] of Object.entries(CUSTO_JULHO_NO_CADASTRO)) {
        expect(julho[Number(id)]).toBeCloseTo(esperado, 3);
    }
});

test('aplicar o custo de julho aos outros meses erra, e o erro troca de sinal', () => {
    const custoJulho = custoDoMes(7);

    const erroPorMes = ([1, 2, 3, 4, 5, 6] as const).map((mes) => {
        const custoEpoca = custoDoMes(mes);
        const linhas = db
            .query(
                `SELECT bico, litros, venda_bico FROM encerrante_diario
                 WHERE ano = 2026 AND mes = ? AND dado_incompleto = 0 AND litros IS NOT NULL`
            )
            .all(mes) as LinhaEncerrante[];

        // Quanto o LUCRO se desloca ao trocar o custo da época pelo de julho.
        // A receita é a mesma nos dois casos, então o desvio do lucro é
        // `custo_da_época − custo_de_julho` — o inverso do desvio do custo.
        // Custo de julho MAIOR que o da época (jan/fev) => lucro aparece MENOR.
        let desvio = 0;
        for (const linha of linhas) {
            const combustivel = BICO_COMBUSTIVEL[linha.bico];
            desvio += linha.litros * (custoEpoca[combustivel] - custoJulho[combustivel]);
        }
        return { mes, desvio };
    });

    // Janeiro e fevereiro para BAIXO (custo de julho maior que o da época);
    // março a junho para CIMA. Sem viés constante — não dá para compensar.
    expect(erroPorMes.find((e) => e.mes === 1)!.desvio).toBeLessThan(0);
    expect(erroPorMes.find((e) => e.mes === 2)!.desvio).toBeLessThan(0);
    expect(erroPorMes.find((e) => e.mes === 4)!.desvio).toBeGreaterThan(0);

    // O maior desvio isolado passa de R$ 10 mil — a ordem de grandeza importa
    // tanto quanto o sinal, e é o que justifica ter mexido na RPC.
    const maior = Math.max(...erroPorMes.map((e) => Math.abs(e.desvio)));
    expect(maior).toBeGreaterThan(10_000);
});
