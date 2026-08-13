/**
 * Golden master do LUCRO REAL contra os 7 meses de 2026.
 *
 * Fonte: `docs/data/posto_jorro_2026.sqlite`, gerado pelo estágio 2 do ETL a
 * partir de `Posto,Jorro, 2026.xlsx`. Roda sob `bun test`; vitest ignora.
 *
 * Complementa `lucro.golden.spec.ts`, que cobre só o mês 01 pelo fixture JSON.
 * Aqui a granularidade é a mesma (mensal), mas a cobertura vai a 7 meses × 42 bicos.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A "SEGUNDA LISTA DE DESPESA" NÃO EXISTE — RETRATAÇÃO DE 12/08/2026.
 *
 * Até 12/08 este arquivo travava um segundo livro-caixa, `despesa_trimestral`,
 * de R$ 195.230,40 nos 7 meses, e declarava que o lucro REAL do posto era
 * R$ 165.785,32 (margem 8,63%) em vez dos R$ 220.559,42 (11,48%) que a planilha
 * exibe — uma diferença de R$ 54.774,13. Aquilo foi removido.
 *
 * O que se apurou, na ordem:
 *
 * 1. O dono afirma que nunca houve lista trimestral: o único cálculo do posto
 *    sempre foi o lucro mensal.
 * 2. A planilha concorda. Varredura de TODA célula de texto das 12 abas por
 *    substring sem acento, mais busca numérica pelos três totais conhecidos
 *    (195.230,40 · 54.774,13 · 31.710,88): zero ocorrências. Os rótulos
 *    exclusivos que o texto antigo citava — Embasa, Net, Luz, extintor, conserto
 *    de bomba — não existem em aba nenhuma.
 * 3. Mas em 31/07 a suíte passou com 308 goldens e zero falhas, e teste que
 *    consulta tabela inexistente estoura em vez de passar. Logo a tabela existia
 *    no sqlite daquela época, alimentada por algo.
 *
 * A leitura que reconcilia os três: **golden construído a partir da saída do ETL
 * valida a fórmula, não o dado.** Se o ETL de 31/07 leu algum bloco como se fosse
 * um segundo livro-caixa, este golden travou o engano com fidelidade perfeita e
 * passou verde para sempre. O `atualizado.xlsx` daquela extração se perdeu junto
 * com `docs/data/` em 29/07, então não há como conferir qual bloco foi lido.
 *
 * Fica o aprendizado, que vale mais que o número: golden master prova que o
 * cálculo é estável, **não** que a entrada é verdadeira. Dado novo que vira
 * referência precisa de conferência contra a fonte — não contra o próprio ETL
 * que o produziu.
 *
 * O que este arquivo trava HOJE: que a fórmula, alimentada com a lista mensal —
 * a única que existe —, reproduz o lucro que a planilha calcula, nos 7 meses e
 * 42 bicos, com tolerância de centavos.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, lucroCombustivel, margemPercentual } from './lucro';
import { somarDespesas } from './despesa';

const SQLITE = `${import.meta.dir}/../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Dinheiro arredonda ao centavo por bico; R$ 0,05 cobre o acúmulo em 6 bicos. */
const TOL = 0.05;

const MESES = [1, 2, 3, 4, 5, 6, 7] as const;

interface LinhaBico {
    bico: string;
    litros: number;
    valor_lt: number | null;
    venda: number;
    lucro_bico: number | null;
}

/**
 * Custo médio de compra vem por PRODUTO; o resumo mensal vem por BICO.
 * O prefixo do nome do bico é o que liga os dois — mesma regra do fixture do mês 01.
 */
const produtoDoBico = (bico: string): string => {
    if (bico.startsWith('G,C')) return 'G,Comum.';
    if (bico.startsWith('G,A')) return 'G,Aditivada.';
    if (bico.startsWith('Etanol')) return 'Etanol.';
    if (bico.startsWith('Ds')) return 'Ds.10.';
    throw new Error(`produto sem custo mapeado: ${bico}`);
};

const bicosDoMes = (mes: number): LinhaBico[] =>
    db
        .query<LinhaBico, [number]>(
            'SELECT bico, litros, valor_lt, venda, lucro_bico FROM resumo_mensal_bico WHERE ano=2026 AND mes=? ORDER BY bico'
        )
        .all(mes);

const custosDoMes = (mes: number): Record<string, number> => {
    const mapa: Record<string, number> = {};
    for (const c of db
        .query<{ produto: string; media_lt: number }, [number]>(
            'SELECT produto, media_lt FROM compra_mensal WHERE ano=2026 AND mes=?'
        )
        .all(mes)) {
        mapa[c.produto] = c.media_lt;
    }
    return mapa;
};

/** Lista MENSAL — a que o bloco de lucro da planilha usa. */
const despesaMensal = (mes: number): number =>
    db.query<{ v: number }, [number]>('SELECT valor v FROM despesa_mensal WHERE ano=2026 AND mes=?').get(mes)?.v ?? 0;

/** Lucro do mês somando bico a bico, com a despesa rateada por litro. */
const lucroDoMes = (mes: number, despesaTotal: number): number => {
    const bicos = bicosDoMes(mes);
    const custos = custosDoMes(mes);
    const litros = bicos.reduce((s, b) => s + b.litros, 0);
    const despOp = despesaOperacionalPorLitro(despesaTotal, litros);
    return bicos.reduce(
        (s, b) =>
            s +
            lucroCombustivel({
                litros: b.litros,
                // Bico 06 tem valor_lt nulo na planilha; deriva-se o preço da venda.
                precoVenda: b.valor_lt ?? b.venda / b.litros,
                custoMedio: custos[produtoDoBico(b.bico)],
                despesaOperacionalLitro: despOp,
            }),
        0
    );
};

// ─── 1. A FÓRMULA ESTÁ CERTA ────────────────────────────────────────────────
// Alimentada com a MESMA lista de despesa que a planilha usa, ela tem de
// reproduzir o lucro que a planilha calculou. Sem tolerância folgada: centavos.

for (const mes of MESES) {
    test(`mês ${String(mes).padStart(2, '0')}: fórmula reproduz o lucro da planilha (despesa mensal)`, () => {
        const planilha = bicosDoMes(mes).reduce((s, b) => s + (b.lucro_bico ?? 0), 0);
        const calculado = lucroDoMes(mes, despesaMensal(mes));
        expect(Math.abs(calculado - planilha)).toBeLessThan(TOL);
    });
}

test('7 meses: fórmula reproduz o lucro total da planilha (despesa mensal)', () => {
    const planilha = MESES.reduce(
        (s, m) => s + bicosDoMes(m).reduce((a, b) => a + (b.lucro_bico ?? 0), 0),
        0
    );
    const calculado = MESES.reduce((s, m) => s + lucroDoMes(m, despesaMensal(m)), 0);
    expect(Math.abs(calculado - planilha)).toBeLessThan(TOL);
    // Valor de referência apurado em 31/07/2026.
    expect(Math.abs(planilha - 220_559.42)).toBeLessThan(TOL);
});

// ─── 2. OS AGREGADOS DOS 7 MESES ────────────────────────────────────────────
// Litros, receita, despesa e margem do negócio inteiro, travados de uma vez. Os
// três primeiros são medidos contra a planilha; a margem é a que ela exibe.

test('7 meses: litros, receita, despesa e margem', () => {
    const litros = MESES.reduce((s, m) => s + bicosDoMes(m).reduce((a, b) => a + b.litros, 0), 0);
    const receita = MESES.reduce((s, m) => s + bicosDoMes(m).reduce((a, b) => a + b.venda, 0), 0);
    const despesa = MESES.reduce((s, m) => s + despesaMensal(m), 0);
    const lucro = MESES.reduce((s, m) => s + lucroDoMes(m, despesaMensal(m)), 0);

    expect(Math.abs(litros - 283_506.34)).toBeLessThan(0.01);
    expect(Math.abs(receita - 1_921_455.03)).toBeLessThan(TOL);
    expect(Math.abs(despesa - 140_456.27)).toBeLessThan(TOL);
    expect(Math.abs(lucro - 220_559.42)).toBeLessThan(TOL);

    // 11,48% — a margem que a planilha do posto sempre exibiu. O 8,63% que este
    // arquivo travou entre 31/07 e 12/08 vinha da despesa fantasma; ver o topo.
    expect(margemPercentual(lucro, receita)).toBeCloseTo(11.48, 1);
});

// ─── 3. A ARMADILHA DA LINHA DE TOTAL ───────────────────────────────────────
// Somar a coluna crua devolve exatamente o dobro. Travado aqui para que, se o
// ETL parar de trazer a linha de total, alguém veja — em vez de o rateio mudar sozinho.

test('somar a coluna crua de despesa_categoria_mensal devolve o DOBRO', () => {
    const linhas = db
        .query<{ categoria: string | null; valor: number | null }, []>(
            'SELECT categoria, valor FROM despesa_categoria_mensal WHERE ano=2026'
        )
        .all();
    const cru = linhas.reduce((s, l) => s + (l.valor ?? 0), 0);
    const limpo = somarDespesas(linhas);

    expect(Math.abs(limpo - 140_456.27)).toBeLessThan(TOL);
    expect(Math.abs(cru - limpo * 2)).toBeLessThan(TOL);
});

/**
 * A tabela de despesa cobre os 12 MESES do ano; a de venda, só os 7 realizados.
 *
 * @remarks Agosto a dezembro estão zerados hoje, mas as colunas existem. Somar a tabela
 *          inteira contra receita de 7 meses é o erro que este teste vigia: enquanto os
 *          meses futuros estiverem em branco a soma coincide, e no dia em que alguém
 *          lançar despesa à frente ela deixa de coincidir — e aí o teste quebra em vez
 *          de o rateio inflar sozinho.
 */
test('despesa_mensal tem os 12 meses — filtrar por mês é obrigatório', () => {
    const meses = db
        .query<{ mes: number }, []>('SELECT DISTINCT mes FROM despesa_mensal WHERE ano=2026 ORDER BY mes')
        .all()
        .map((r) => r.mes);
    expect(meses).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

    const todosOsMeses = somarDespesas(
        db
            .query<{ categoria: string | null; valor: number | null }, []>(
                'SELECT categoria, valor FROM despesa_categoria_mensal WHERE ano=2026'
            )
            .all()
    );
    const seteMeses = MESES.reduce((s, m) => s + despesaMensal(m), 0);
    expect(Math.abs(todosOsMeses - seteMeses)).toBeLessThan(TOL);
});

test('despesa_mensal e despesa_categoria_mensal são a MESMA lista', () => {
    for (const mes of MESES) {
        const porCategoria = somarDespesas(
            db
                .query<{ categoria: string | null; valor: number | null }, [number]>(
                    'SELECT categoria, valor FROM despesa_categoria_mensal WHERE ano=2026 AND mes=?'
                )
                .all(mes)
        );
        expect(Math.abs(porCategoria - despesaMensal(mes))).toBeLessThan(TOL);
    }
});
