import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Frentista } from '../../types/database/index';
import { lerFrentistasDaApi, paraFrentistasAtivos } from './frentista.api';

/** Forma real de `GET /api/postos/1/frentistas` na API local (19/09/2026), com o `turno` aninhado que o painel não lê. */
const respostaDaApi = {
    data: [
        {
            id: 3,
            nome: 'Barbara',
            telefone: '(00) 00000-0003',
            data_admissao: '2026-01-27T00:00:00.000000Z',
            ativo: false,
            turno_id: 2,
            turno: { id: 2, nome: 'Tarde', horario_inicio: '14:00:00', horario_fim: '22:00:00', ativo: true },
        },
        {
            id: 7,
            nome: 'Elyon',
            telefone: '(00) 00000-0007',
            data_admissao: '2026-01-27T00:46:34.901295Z',
            ativo: true,
            turno_id: 2,
            turno: { id: 2, nome: 'Tarde', horario_inicio: '14:00:00', horario_fim: '22:00:00', ativo: true },
        },
        {
            id: 11,
            nome: 'Zeca',
            telefone: null,
            data_admissao: '2026-02-01T00:00:00.000000Z',
            ativo: true,
            turno_id: null,
            turno: null,
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

describe('paraFrentistasAtivos', () => {
    it('tira o inativo, mantém a ordem da API e devolve a mesma forma que o Supabase entrega hoje', () => {
        // O literal é tipado como `Frentista` de propósito: se o tipo do painel ganhar campo
        // obrigatório novo, este teste deixa de compilar antes de a tela quebrar.
        const esperado: Frentista[] = [
            {
                id: 7,
                nome: 'Elyon',
                cpf: null,
                telefone: '(00) 00000-0007',
                data_admissao: '2026-01-27T00:46:34.901295Z',
                ativo: true,
                user_id: null,
                turno_id: 2,
                posto_id: 1,
            },
            {
                id: 11,
                nome: 'Zeca',
                cpf: null,
                telefone: null,
                data_admissao: '2026-02-01T00:00:00.000000Z',
                ativo: true,
                user_id: null,
                turno_id: null,
                posto_id: 1,
            },
        ];

        expect(paraFrentistasAtivos(respostaDaApi.data, 1)).toEqual(esperado);
    });

    it('frentista inativo não entra na lista, mesmo sendo o primeiro da API', () => {
        expect(paraFrentistasAtivos(respostaDaApi.data, 1).map((f) => f.id)).not.toContain(3);
    });
});

describe('lerFrentistasDaApi', () => {
    it('chama a rota do posto na base configurada, sem barra dobrada, e já filtra ativo', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom(respostaDaApi);

        const lido = await lerFrentistasDaApi(1);

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/frentistas', expect.anything());
        expect(lido.isOk() && lido.value.map((f) => f.id)).toEqual([7, 11]);
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerFrentistasDaApi(1);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('status de erro vira erro http com o status', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Not Found' }, 404);

        const lido = await lerFrentistasDaApi(99);

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'http', status: 404 });
    });

    it('resposta fora do contrato (ativo como string) vira erro de formato, não frentista fantasma', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: [{ id: 7, nome: 'Elyon', telefone: null, data_admissao: '2026-01-27', ativo: 'true', turno_id: null }] });

        const lido = await lerFrentistasDaApi(1);

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });
});
