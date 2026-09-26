import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BicoComDetalhes } from '../../types/fechamento';
import { lerBicosComDetalhesDaApi, paraBicosComDetalhes } from './bico.api';

/** Forma real de `GET /api/postos/1/bicos` na API local (19/09/2026), mais um bico inativo e um sem tanque. */
const respostaDaApi = {
    data: [
        {
            id: 7,
            numero: 1,
            ativo: true,
            bomba: { id: 4, nome: 'BOMBA 01', localizacao: null, ativo: true },
            combustivel: {
                id: 1,
                nome: 'Gasolina Comum',
                codigo: 'GC',
                cor: '#FFD700',
                ativo: true,
                preco_venda: '6.98',
                preco_custo: '5.3452',
            },
            tanque: { id: 1, nome: 'Tanque GC', combustivel_id: 1, capacidade: '15000.00', estoque_atual: '0.00', ativo: true },
        },
        {
            id: 8,
            numero: 2,
            ativo: false,
            bomba: { id: 4, nome: 'BOMBA 01', localizacao: null, ativo: true },
            combustivel: {
                id: 2,
                nome: 'Gasolina Aditivada',
                codigo: 'GA',
                cor: '#FF4500',
                ativo: true,
                preco_venda: '6.98',
                preco_custo: '5.3110',
            },
            tanque: { id: 2, nome: 'Tanque GA', combustivel_id: 2, capacidade: '15000.00', estoque_atual: '0.00', ativo: true },
        },
        {
            id: 12,
            numero: 6,
            ativo: true,
            bomba: { id: 6, nome: 'BOMBA 03', localizacao: 'ilha 2', ativo: true },
            combustivel: {
                id: 3,
                nome: 'Etanol',
                codigo: 'ET',
                cor: null,
                ativo: true,
                preco_venda: '4.59',
                preco_custo: null,
            },
            tanque: null,
        },
    ],
};

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('paraBicosComDetalhes', () => {
    it('devolve a mesma forma que o Supabase entrega hoje: preço em número, ids achatados, inativo fora', () => {
        // O literal é tipado como `BicoComDetalhes` de propósito: se `Bico`, `Bomba` ou
        // `Combustivel` ganharem campo obrigatório novo, este teste deixa de compilar.
        const esperado: BicoComDetalhes[] = [
            {
                id: 7,
                numero: 1,
                ativo: true,
                bomba_id: 4,
                combustivel_id: 1,
                tanque_id: 1,
                posto_id: 1,
                bomba: { id: 4, nome: 'BOMBA 01', localizacao: null, ativo: true, posto_id: 1 },
                combustivel: {
                    id: 1,
                    nome: 'Gasolina Comum',
                    codigo: 'GC',
                    cor: '#FFD700',
                    ativo: true,
                    preco_venda: 6.98,
                    preco_custo: 5.3452,
                    posto_id: 1,
                },
            },
            {
                id: 12,
                numero: 6,
                ativo: true,
                bomba_id: 6,
                combustivel_id: 3,
                tanque_id: null,
                posto_id: 1,
                bomba: { id: 6, nome: 'BOMBA 03', localizacao: 'ilha 2', ativo: true, posto_id: 1 },
                combustivel: {
                    id: 3,
                    nome: 'Etanol',
                    codigo: 'ET',
                    cor: null,
                    ativo: true,
                    preco_venda: 4.59,
                    preco_custo: 0,
                    posto_id: 1,
                },
            },
        ];

        expect(paraBicosComDetalhes(respostaDaApi.data, 1)).toEqual(esperado);
    });

    it('preco_venda "6.98" vira exatamente o número 6.98 que o PostgREST entrega — sem arredondar nem escalar', () => {
        const [primeiro] = paraBicosComDetalhes(respostaDaApi.data, 1);

        expect(primeiro?.combustivel.preco_venda).toBe(6.98);
        expect(typeof primeiro?.combustivel.preco_venda).toBe('number');
    });

    it('bico inativo não entra, então não entra no total de venda do dia', () => {
        expect(paraBicosComDetalhes(respostaDaApi.data, 1).map((b) => b.id)).toEqual([7, 12]);
    });
});

describe('lerBicosComDetalhesDaApi', () => {
    it('chama a rota do posto na base configurada e já filtra ativo', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom(respostaDaApi);

        const lido = await lerBicosComDetalhesDaApi(1);

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/bicos', expect.anything());
        expect(lido.isOk() && lido.value.map((b) => b.numero)).toEqual([1, 6]);
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerBicosComDetalhesDaApi(1);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('preco_venda em número cru é resposta fora do contrato, não dado a converter', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        const [bico] = respostaDaApi.data;
        respondeCom({ data: [{ ...bico, combustivel: { ...bico?.combustivel, preco_venda: 6.98 } }] });

        const lido = await lerBicosComDetalhesDaApi(1);

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('status de erro vira erro http com o status', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Not Found' }, 404);

        const lido = await lerBicosComDetalhesDaApi(99);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'http', status: 404 });
    });
});
