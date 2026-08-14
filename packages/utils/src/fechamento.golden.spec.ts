/**
 * Golden master do Fechamento contra dado REAL de janeiro.
 *
 * @remarks
 * Regra da skill fechamento-posto-providencia: nunca consolidar as fórmulas
 * duplicadas sem um teste rodando contra `docs/data/janeiro_referencia.sqlite`.
 * Valida a composição do `conferido` (Venda Frentistas = soma das 7 formas de
 * pagamento) linha a linha. Roda sob `bun test` (usa bun:sqlite nativo);
 * o vitest ignora este arquivo (padrão *.test.ts, não *.spec.ts).
 *
 * Comparação em CENTAVOS inteiros (skill: escalar dinheiro para inteiro).
 * Dia 31 é excluído: são linhas de fechamento MENSAL (total ≈ 1,8× a soma),
 * não fechamento diário.
 */
import { Database } from 'bun:sqlite';
import { test, expect } from 'bun:test';
import {
    conferido,
    conferidoImplicito,
    diferenca,
    semLancamento,
    meiosFromFechamentoRow,
} from './fechamento';

const DB_PATH = `${import.meta.dir}/../../../docs/data/janeiro_referencia.sqlite`;
const db = new Database(DB_PATH, { readonly: true });

interface LinhaFrentista {
    dia: number;
    frentista: string;
    pix: number;
    credito: number;
    debito: number;
    moeda: number;
    notas: number;
    baratao: number;
    dinheiro: number;
    total: number;
}

const centavos = (reais: number): number => Math.round(reais * 100);

// Dia 31 = fechamento mensal (ver skill), fora do golden diário.
const linhas = db
    .query('SELECT * FROM jan_frentista WHERE dia <> 31')
    .all() as unknown as LinhaFrentista[];

test('há dados de janeiro para validar', () => {
    expect(linhas.length).toBeGreaterThan(100);
});

for (const l of linhas) {
    test(`conferido bate com a referência — dia ${l.dia} / ${l.frentista}`, () => {
        const meios = meiosFromFechamentoRow({
            valor_dinheiro: l.dinheiro,
            valor_moedas: l.moeda,
            valor_pix: l.pix,
            valor_cartao: 0, // referência já traz débito/crédito separados
            valor_cartao_debito: l.debito,
            valor_cartao_credito: l.credito,
            valor_nota: l.notas,
            valor_baratao: l.baratao,
        });
        expect(centavos(conferido(meios))).toBe(centavos(l.total));
    });
}

/**
 * Golden do estado "sem lançamento", contra os mesmos dias reais de janeiro.
 *
 * @remarks
 * Prova duas coisas sobre `conferidoImplicito`/`semLancamento`, que existem para
 * substituir a heurística que zerava a diferença na tela do relatório diário:
 *
 * 1. A recuperação do conferido a partir de (encerrante, diferença) é EXATA no
 *    dado real — não é estimativa.
 * 2. `semLancamento` é falso em todo dia de janeiro: nenhum dia real ficou sem
 *    meio de pagamento lançado. É o mesmo que a produção mostra hoje (0 de 213
 *    fechamentos com conferido zerado), medido aqui contra a referência.
 */
interface DiaJaneiro {
    dia: number;
    concentrador: number;
    conferido: number;
}

const dias = db
    .query(
        `SELECT e.dia                       AS dia,
                SUM(e.venda_bico)           AS concentrador,
                (SELECT SUM(f.total) FROM jan_frentista f WHERE f.dia = e.dia) AS conferido
           FROM jan_encerrante e
          WHERE e.dia <> 31
          GROUP BY e.dia
          HAVING conferido IS NOT NULL
          ORDER BY e.dia`
    )
    .all() as unknown as DiaJaneiro[];

test('há dias de janeiro com encerrante E frentista para cruzar', () => {
    expect(dias.length).toBeGreaterThan(20);
});

for (const d of dias) {
    const diferencaDoDia = diferenca(d.concentrador, d.conferido);

    test(`conferido é recuperável a partir da diferença — dia ${d.dia}`, () => {
        expect(centavos(conferidoImplicito(d.concentrador, diferencaDoDia)))
            .toBe(centavos(d.conferido));
    });

    test(`dia real de janeiro não é "sem lançamento" — dia ${d.dia}`, () => {
        expect(semLancamento(d.concentrador, diferencaDoDia)).toBe(false);
    });
}
