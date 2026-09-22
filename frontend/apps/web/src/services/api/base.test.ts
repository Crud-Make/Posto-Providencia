import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { buscarNaApi, descreverErroDaApi, enviarParaApi } from './base';

/**
 * O transporte da API Laravel: `buscarNaApi` (GET, desde a P5) e `enviarParaApi` (PUT, #103 P11).
 * O que se prova aqui é a borda — fetch, status, envelope de recusa, schema —, não nenhum contrato
 * de rota; os contratos ficam em cada `*.api.test.ts`.
 */

const schema = z.object({ data: z.object({ id: z.number().int() }) });

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

/** O que o `fetch` recebeu como `RequestInit` na única chamada. */
function requisicaoEnviada(): RequestInit {
    const chamada = vi.mocked(fetch).mock.calls[0];
    const init: unknown = chamada?.[1];
    return typeof init === 'object' && init !== null ? (init as RequestInit) : {};
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('enviarParaApi', () => {
    it('faz PUT com JSON no corpo, Content-Type e o caminho na base, e devolve Ok com o corpo validado', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom({ data: { id: 77 } });

        const resultado = await enviarParaApi('/api/postos/1/fechamento?data=2026-01-05', 'PUT', { totais: { total_vendas: '600.00' } }, schema);

        expect(resultado.isOk() && resultado.value).toEqual({ data: { id: 77 } });
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/fechamento?data=2026-01-05', expect.anything());

        const enviada = requisicaoEnviada();
        expect(enviada.method).toBe('PUT');
        expect(enviada.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' });
        // A string decimal atravessa intacta: nada vira float no caminho.
        expect(enviada.body).toBe('{"totais":{"total_vendas":"600.00"}}');
    });

    it('422 com o envelope { erro } vira Err recusado, com código, mensagem e campos', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ erro: { codigo: 'corpo_invalido', mensagem: 'Corpo fora do contrato.', campos: { 'sessoes.0.valor_dinheiro': ['string decimal'] } } }, 422);

        const resultado = await enviarParaApi('/api/x', 'PUT', {}, schema);

        expect(resultado.isErr() && resultado.error).toEqual({
            tipo: 'recusado',
            status: 422,
            codigo: 'corpo_invalido',
            mensagem: 'Corpo fora do contrato.',
            campos: { 'sessoes.0.valor_dinheiro': ['string decimal'] },
        });
    });

    it('422 de domínio sem campos vira Err recusado sem a chave campos (exactOptionalPropertyTypes)', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ erro: { codigo: 'fora_da_janela', mensagem: 'O dia 30/12/2025 está fora da janela.' } }, 422);

        const resultado = await enviarParaApi('/api/x', 'PUT', {}, schema);

        expect(resultado.isErr() && resultado.error).toEqual({ tipo: 'recusado', status: 422, codigo: 'fora_da_janela', mensagem: 'O dia 30/12/2025 está fora da janela.' });
        expect(resultado.isErr() && 'campos' in resultado.error).toBe(false);
    });

    it('422 SEM o envelope (o { message, errors } padrão do Laravel) continua sendo erro http', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'The data field is required.', errors: { data: ['required'] } }, 422);

        const resultado = await enviarParaApi('/api/x', 'PUT', {}, schema);

        expect(resultado.isErr() && resultado.error).toEqual({ tipo: 'http', status: 422 });
    });

    it('401, 403 e 500 são erro http com o status — a recusa explicada é só 422/409', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        for (const status of [401, 403, 500]) {
            respondeCom({ erro: { codigo: 'x', mensagem: 'y' } }, status);
            const resultado = await enviarParaApi('/api/x', 'PUT', {}, schema);
            expect(resultado.isErr() && resultado.error).toEqual({ tipo: 'http', status });
        }
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const resultado = await enviarParaApi('/api/x', 'PUT', {}, schema);

        expect(resultado.isErr() && resultado.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('200 com corpo fora do schema é erro formato, nunca dado', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: { id: '77' } });

        const resultado = await enviarParaApi('/api/x', 'PUT', {}, schema);

        expect(resultado.isErr() && resultado.error.tipo).toBe('formato');
    });

    it('fetch que rejeita vira erro rede, nunca exceção', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))));

        const resultado = await enviarParaApi('/api/x', 'PUT', {}, schema);

        expect(resultado.isErr() && resultado.error).toEqual({ tipo: 'rede', detalhe: 'ECONNREFUSED' });
    });
});

describe('buscarNaApi — o GET não mudou com a extração do miolo', () => {
    it('faz GET sem método nem corpo e devolve Ok com o corpo validado', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: { id: 5 } });

        const resultado = await buscarNaApi('/api/x', schema);

        expect(resultado.isOk() && resultado.value).toEqual({ data: { id: 5 } });
        const enviada = requisicaoEnviada();
        expect(enviada.method).toBeUndefined();
        expect(enviada.body).toBeUndefined();
        expect(enviada.headers).toEqual({ Accept: 'application/json' });
    });

    it('404 continua erro http com o status', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Not Found' }, 404);

        const resultado = await buscarNaApi('/api/x', schema);

        expect(resultado.isErr() && resultado.error).toEqual({ tipo: 'http', status: 404 });
    });
});

describe('descreverErroDaApi', () => {
    it('cobre as cinco variantes com texto em pt-BR', () => {
        expect(descreverErroDaApi({ tipo: 'sem_api' })).toBe('VITE_API_URL não definida');
        expect(descreverErroDaApi({ tipo: 'rede', detalhe: 'x' })).toContain('inacessível');
        expect(descreverErroDaApi({ tipo: 'http', status: 500 })).toContain('500');
        expect(descreverErroDaApi({ tipo: 'formato', detalhe: 'y' })).toContain('fora do contrato');
        expect(descreverErroDaApi({ tipo: 'recusado', status: 422, codigo: 'totais_inconsistentes', mensagem: 'diferenca errada' })).toBe(
            'Gravação recusada (totais_inconsistentes): diferenca errada',
        );
    });
});
