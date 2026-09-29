/**
 * A aba Receitas e Despesas pela API (#103): o que vai para o servidor é o que a tela decidiu.
 * `data` e `valor` saem como estavam (o valor em string decimal, quantizado pelo `emCentavos`), as
 * Fixas e Taxas com as mesmas colunas de `despesaFixaService.lancar`, e as Fixas pendentes pela
 * MESMA função pura `fixasPendentes` — a regra não muda de lugar.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { okAsync } from 'neverthrow';

const api = vi.hoisted(() => ({
    lancarDespesasNaApi: vi.fn(),
    lerDespesasRecorrentes: vi.fn(),
    lerDespesasDoPeriodo: vi.fn(),
}));
vi.mock('../../../services/api/despesas.api', async (original) => ({
    ...(await original<typeof import('../../../services/api/despesas.api')>()),
    despesasPelaApi: () => true,
    ...api,
}));
vi.mock('../../../services/api', () => ({ despesaService: { create: vi.fn(), getByMonth: vi.fn() } }));
vi.mock('../../../services/api/despesa-fixa.service', () => ({ despesaFixaService: { lancar: vi.fn(), pendentesDoMes: vi.fn() } }));

const { criarDespesa, fixasPendentesDoMes, lancarMensais } = await import('./fonteDasDespesas');
const { valorEmTexto } = await import('../../../services/api/despesas.api');

const despesa = (id: number, descricao: string, valor: string, data: string, recorrente = true) => ({
    id, descricao, categoria: 'Fixas', categoria_id: null, valor, data, status: 'pendente', recorrente, data_pagamento: null, observacoes: null,
});

beforeEach(() => vi.clearAllMocks());

describe('valorEmTexto — dinheiro da tela em string decimal', () => {
    it.each([
        [123.45, '123.45'],
        [0.1 + 0.2, '0.30'],
        [1532.07, '1532.07'],
        [10, '10.00'],
    ])('%s → %s', (reais, texto) => {
        expect(valorEmTexto(reais)).toBe(texto);
    });
});

describe('fonte das despesas pela API', () => {
    it('Nova Despesa: os campos do formulário, data como veio, não recorrente, com a chave', async () => {
        api.lancarDespesasNaApi.mockImplementation(() => okAsync([despesa(1, 'Troca de óleo', '250.00', '2026-09-12', false)]));

        const r = await criarDespesa(2, {
            descricao: 'Troca de óleo', categoria: 'Manutenção', valor: 250, data: '2026-09-12', status: 'pago',
            data_pagamento: '2026-09-12', observacoes: '  ', posto_id: 99, categoria_id: 7,
        }, 'chave-1');

        expect(r.isOk()).toBe(true);
        expect(api.lancarDespesasNaApi).toHaveBeenCalledWith(2, 'chave-1', [{
            descricao: 'Troca de óleo', categoria: 'Manutenção', categoria_id: 7, valor: '250.00', data: '2026-09-12',
            status: 'pago', recorrente: false, data_pagamento: '2026-09-12', observacoes: null,
        }]);
    });

    it('Fixas e Taxas: status pendente, recorrente, na data que a TELA escolheu; devolve quantas gravou', async () => {
        api.lancarDespesasNaApi.mockImplementation(() => okAsync([despesa(1, 'Aluguel', '3000.00', '2026-08-31'), despesa(2, 'Taxas de cartão — Sipag', '1532.07', '2026-08-31')]));

        const r = await lancarMensais(2, [
            { descricao: 'Aluguel', categoria: 'Fixas', valor: 3000, categoriaId: null },
            { descricao: 'Taxas de cartão — Sipag', categoria: 'Taxas Cartão', valor: 1532.07 },
        ], '2026-08-31', 'chave-2');

        expect(r._unsafeUnwrap()).toBe(2);
        expect(api.lancarDespesasNaApi).toHaveBeenCalledWith(2, 'chave-2', [
            { descricao: 'Aluguel', categoria: 'Fixas', categoria_id: null, valor: '3000.00', data: '2026-08-31', status: 'pendente', recorrente: true, data_pagamento: null, observacoes: null },
            { descricao: 'Taxas de cartão — Sipag', categoria: 'Taxas Cartão', categoria_id: null, valor: '1532.07', data: '2026-08-31', status: 'pendente', recorrente: true, data_pagamento: null, observacoes: null },
        ]);
    });

    it('Fixas pendentes: recorrentes do posto + as do mês, pela mesma fixasPendentes (a já lançada some)', async () => {
        api.lerDespesasRecorrentes.mockImplementation(() => okAsync([
            despesa(1, 'Aluguel', '3000.00', '2026-07-31'),
            despesa(2, 'Energia', '850.00', '2026-07-31'),
            despesa(3, 'Energia', '910.50', '2026-08-31'),
        ]));
        api.lerDespesasDoPeriodo.mockImplementation(() => okAsync([despesa(4, 'Aluguel', '3000.00', '2026-09-30')]));

        const pendentes = (await fixasPendentesDoMes(2, '2026-09'))._unsafeUnwrap();

        expect(api.lerDespesasDoPeriodo).toHaveBeenCalledWith(2, '2026-09-01', '2026-09-30');
        expect(pendentes).toEqual([expect.objectContaining({ descricao: 'Energia', valorSugerido: 910.5, referencia: '2026-08' })]);
    });
});
