import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../supabase', () => ({
    supabase: { from: fromMock },
}));

vi.mock('./fechamentoFrentista.service', () => ({
    fechamentoFrentistaService: { getHistoricoDiferencas: vi.fn() },
}));

import { aggregatorService } from './aggregator.service';
import { fechamentoFrentistaService } from './fechamentoFrentista.service';

/**
 * Caixa que BATE, com moedas: o frentista recebeu R$ 100 em dinheiro + R$ 5,50 em
 * moedas; o `valor_conferido` gravado (105,50) já as inclui e o encerrante também
 * deu 105,50 → `diferenca_calculada = 0`.
 *
 * A soma manual antiga (que ignorava `valor_moedas`) dava 100 − 105,50 = −5,50 e
 * marcava o dia como "Divergente". É o falso positivo que este teste tranca.
 */
const LINHA_QUE_BATE = {
    id: 1,
    valor_dinheiro: 100,
    valor_moedas: 5.5,
    valor_pix: 0,
    valor_cartao: 0,
    valor_cartao_debito: 0,
    valor_cartao_credito: 0,
    valor_nota: 0,
    baratao: 0,
    valor_conferido: 105.5,
    diferenca_calculada: 0,
    fechamento: { data: '2026-01-15' },
};

/**
 * Falta REAL de caixa, também com moedas: conferido 105,50 contra encerrante de
 * 115,50 → `diferenca_calculada = 10` (positivo = FALTA).
 *
 * A soma manual antiga dava −5,50 aqui: acusava "Divergente" pelo motivo errado e
 * com o valor errado. O teste exige o valor certo, não só o status certo.
 */
const LINHA_COM_FALTA_REAL = {
    id: 2,
    valor_dinheiro: 100,
    valor_moedas: 5.5,
    valor_pix: 0,
    valor_cartao: 0,
    valor_cartao_debito: 0,
    valor_cartao_credito: 0,
    valor_nota: 0,
    baratao: 0,
    valor_conferido: 105.5,
    diferenca_calculada: 10,
    fechamento: { data: '2026-01-16' },
};

/** Builder mínimo do Supabase: `Frentista` devolve um frentista, `FechamentoFrentista`
 *  (consulta de caixas abertos) devolve vazio. */
function buildQuery(tabela: string) {
    const dados = tabela === 'Frentista'
        ? [{
            id: 7,
            nome: 'Frentista Teste',
            telefone: null,
            ativo: true,
            data_admissao: '2026-01-01',
            cpf: null,
            posto_id: 1,
        }]
        : [];

    const builder = {
        select: () => builder,
        order: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: dados, error: null }),
    };
    return builder;
}

describe('aggregatorService.fetchAttendantsData — divergência do frentista', () => {
    beforeEach(() => {
        fromMock.mockImplementation((tabela: string) => buildQuery(tabela));

        vi.mocked(fechamentoFrentistaService.getHistoricoDiferencas).mockResolvedValue({
            success: true,
            data: [LINHA_QUE_BATE, LINHA_COM_FALTA_REAL],
            timestamp: new Date().toISOString(),
        } as never);
    });

    it('não marca como Divergente um dia em que o caixa fecha com moedas', async () => {
        const result = await aggregatorService.fetchAttendantsData();

        expect(result.success).toBe(true);
        if (!result.success) return;

        const entrada = result.data.history.find(h => h.id === '1');
        expect(entrada?.value).toBe(0);
        expect(entrada?.status).toBe('OK');
    });

    it('acusa a falta real de caixa com o valor da diferença, não com o resíduo da soma', async () => {
        const result = await aggregatorService.fetchAttendantsData();

        expect(result.success).toBe(true);
        if (!result.success) return;

        const entrada = result.data.history.find(h => h.id === '2');
        expect(entrada?.value).toBe(10);
        expect(entrada?.status).toBe('Divergente');
    });

    it('conta na taxa de divergência só o dia que de fato divergiu (1 de 2 = 50%)', async () => {
        const result = await aggregatorService.fetchAttendantsData();

        expect(result.success).toBe(true);
        if (!result.success) return;

        expect(result.data.list[0]?.divergenceRate).toBe(50);
    });
});
