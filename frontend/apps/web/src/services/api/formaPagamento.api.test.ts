import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FormaPagamento } from '../../types/database/index';
import { lerFormasDePagamentoDaApi, paraFormasDePagamentoAtivas } from './formaPagamento.api';

/** Forma real de `GET /api/postos/1/formas-pagamento` na API local (19/09/2026), mais uma inativa e uma sem taxa. */
const respostaDaApi = {
    data: [
        { id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: '1.90' },
        { id: 9, nome: 'Baratão', tipo: 'venda', ativo: true, taxa: '0.00' },
        { id: 4, nome: 'Cheque', tipo: 'venda', ativo: false, taxa: '2.50' },
        { id: 2, nome: 'Dinheiro', tipo: 'venda', ativo: true, taxa: null },
    ],
};

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('paraFormasDePagamentoAtivas', () => {
    it('devolve a mesma forma que o Supabase entrega hoje: taxa em número (ou null), inativa fora, ordem mantida', () => {
        // Literal tipado como `FormaPagamento` de propósito: campo obrigatório novo no tipo
        // do painel derruba a compilação deste teste antes de derrubar a tela.
        const esperado: FormaPagamento[] = [
            { id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: 1.9, posto_id: 1 },
            { id: 9, nome: 'Baratão', tipo: 'venda', ativo: true, taxa: 0, posto_id: 1 },
            { id: 2, nome: 'Dinheiro', tipo: 'venda', ativo: true, taxa: null, posto_id: 1 },
        ];

        expect(paraFormasDePagamentoAtivas(respostaDaApi.data, 1)).toEqual(esperado);
    });

    it('taxa "1.90" vira exatamente 1.9, o número que o PostgREST entrega do numeric(5,2)', () => {
        const [app] = paraFormasDePagamentoAtivas(respostaDaApi.data, 1);

        expect(app?.taxa).toBe(1.9);
        expect(typeof app?.taxa).toBe('number');
    });

    it('forma inativa não entra, então não ganha linha no Caixa Geral', () => {
        expect(paraFormasDePagamentoAtivas(respostaDaApi.data, 1).map((f) => f.id)).not.toContain(4);
    });
});

describe('lerFormasDePagamentoDaApi', () => {
    it('chama a rota do posto na base configurada e já filtra ativo', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom(respostaDaApi);

        const lido = await lerFormasDePagamentoDaApi(1);

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/formas-pagamento', expect.anything());
        expect(lido.isOk() && lido.value.map((f) => f.id)).toEqual([7, 9, 2]);
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerFormasDePagamentoDaApi(1);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('taxa em número cru é resposta fora do contrato, não dado a converter', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: [{ id: 7, nome: 'APP', tipo: 'venda', ativo: true, taxa: 1.9 }] });

        const lido = await lerFormasDePagamentoDaApi(1);

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('status de erro vira erro http com o status', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Server Error' }, 500);

        const lido = await lerFormasDePagamentoDaApi(1);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'http', status: 500 });
    });
});
