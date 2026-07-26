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
import { conferido, meiosFromFechamentoRow } from './fechamento';

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
