import { afterEach, describe, expect, it, vi } from 'vitest';
import { gravarFornecedorNaApi, lerFornecedoresDaApi, paraFornecedoresAtivos } from './fornecedor.api';
import { fornecedorService } from './fornecedor.service';

const respostaDaApi = {
    data: [
        { id: 3, nome: 'Distribuidora Padrão', cnpj: '00.000.000/0001-00', contato: null, ativo: true },
        { id: 7, nome: 'Inativa Ltda', cnpj: '11.111.111/0001-11', contato: 'fulano', ativo: false },
        { id: 9, nome: 'Zeta Combustíveis', cnpj: '22.222.222/0001-22', contato: null, ativo: true },
    ],
};

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('paraFornecedoresAtivos', () => {
    it('tira os inativos, mantém a ordem da API e preenche posto_id com o posto pedido', () => {
        expect(paraFornecedoresAtivos(respostaDaApi.data, 1)).toEqual([
            { id: 3, nome: 'Distribuidora Padrão', cnpj: '00.000.000/0001-00', contato: null, ativo: true, posto_id: 1 },
            { id: 9, nome: 'Zeta Combustíveis', cnpj: '22.222.222/0001-22', contato: null, ativo: true, posto_id: 1 },
        ]);
    });
});

describe('lerFornecedoresDaApi', () => {
    it('chama a rota do posto na base configurada, sem barra dobrada', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom(respostaDaApi);

        const lido = await lerFornecedoresDaApi(1);

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/fornecedores', expect.anything());
        expect(lido.isOk() && lido.value.map((f) => f.id)).toEqual([3, 9]);
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerFornecedoresDaApi(1);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('status de erro vira erro http com o status', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Not Found' }, 404);

        const lido = await lerFornecedoresDaApi(99);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'http', status: 404 });
    });

    it('resposta fora do contrato vira erro de formato, não dado torto', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: [{ id: '3', nome: 'Distribuidora Padrão' }] });

        const lido = await lerFornecedoresDaApi(1);

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('falha de rede vira erro de rede', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubGlobal('fetch', vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        }));

        const lido = await lerFornecedoresDaApi(1);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'rede', detalhe: 'Failed to fetch' });
    });
});

describe('fornecedorService.getAll com VITE_API_URL', () => {
    it('lê da API e devolve o ApiResponse que a tela de compras já consome', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom(respostaDaApi);

        const resposta = await fornecedorService.getAll(1);

        expect(resposta.success && resposta.data.map((f) => f.nome)).toEqual(['Distribuidora Padrão', 'Zeta Combustíveis']);
    });

    it('erro da API vira ApiResponse de erro, sem lançar', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({}, 500);

        const resposta = await fornecedorService.getAll(1);

        expect(resposta.success).toBe(false);
        expect(!resposta.success && resposta.error).toBe('API Laravel respondeu 500');
    });
});

describe('gravarFornecedorNaApi (#103, ensaio 30/09)', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('cria com POST e edita com PUT na rota do posto; o posto_id vem da rota', async () => {
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        const pedidos: Array<{ metodo: string; url: string; corpo: unknown }> = [];
        vi.stubGlobal('fetch', vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
            pedidos.push({ metodo: init?.method ?? 'GET', url: new URL(String(entrada)).pathname, corpo: JSON.parse(String(init?.body)) });
            return new Response(JSON.stringify({ data: { id: 9, nome: 'D', cnpj: '11.222.333/0001-81', contato: null, ativo: true } }), { status: 201 });
        }));
        const corpo = { nome: 'D', cnpj: '11222333000181', contato: null, ativo: true };

        const criado = await gravarFornecedorNaApi(2, null, corpo);
        const editado = await gravarFornecedorNaApi(2, 9, corpo);

        expect(editado.isOk()).toBe(true);
        expect(criado._unsafeUnwrap()).toEqual({ id: 9, nome: 'D', cnpj: '11.222.333/0001-81', contato: null, ativo: true, posto_id: 2 });
        expect(pedidos).toEqual([
            { metodo: 'POST', url: '/api/postos/2/fornecedores', corpo },
            { metodo: 'PUT', url: '/api/postos/2/fornecedores/9', corpo },
        ]);
    });
});
