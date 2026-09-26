import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerLeiturasDoDiaDaApi, paraLeiturasDoDia, type LeituraDoDia } from './leitura.api';

/**
 * Forma real de `GET /api/postos/1/leituras?data=2026-01-05` (`LeituraResource.php`), fora da
 * ordem do Supabase de propósito (a API ordena por `bico_id`; o Supabase por `id`), mais uma
 * leitura às 23:30Z do mesmo dia — que a janela da API devolve e o `.eq('data', dia)` do
 * Supabase não.
 */
const respostaDaApi = {
    data: [
        {
            id: 302,
            data: '2026-01-05T00:00:00Z',
            bico_id: 7,
            combustivel_id: 1,
            turno_id: null,
            leitura_inicial: '1716778.963',
            leitura_final: '1716902.419',
            litros_vendidos: '123.456',
            preco_litro: '6.38',
            valor_total: '787.65',
        },
        {
            id: 301,
            data: '2026-01-05T00:00:00Z',
            bico_id: 8,
            combustivel_id: 2,
            turno_id: 1,
            leitura_inicial: '95000.000',
            leitura_final: '95000.000',
            litros_vendidos: '0.000',
            preco_litro: '6.98',
            valor_total: '0.00',
        },
        {
            id: 303,
            data: '2026-01-05T23:30:00Z',
            bico_id: 9,
            combustivel_id: 3,
            turno_id: null,
            leitura_inicial: '10.000',
            leitura_final: '20.000',
            litros_vendidos: '10.000',
            preco_litro: '4.59',
            valor_total: '45.90',
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

describe('paraLeiturasDoDia', () => {
    it('devolve a mesma forma que o Supabase entrega hoje: números, ordem por id, só a meia-noite UTC do dia', () => {
        // O literal é tipado como `LeituraDoDia` de propósito: se `Leitura` ganhar campo
        // obrigatório novo (fora de createdAt/usuario_id), este teste deixa de compilar.
        const esperado: LeituraDoDia[] = [
            {
                id: 301,
                data: '2026-01-05T00:00:00Z',
                bico_id: 8,
                combustivel_id: 2,
                turno_id: 1,
                leitura_inicial: 95000,
                leitura_final: 95000,
                litros_vendidos: 0,
                preco_litro: 6.98,
                valor_total: 0,
                posto_id: 1,
            },
            {
                id: 302,
                data: '2026-01-05T00:00:00Z',
                bico_id: 7,
                combustivel_id: 1,
                turno_id: null,
                leitura_inicial: 1716778.963,
                leitura_final: 1716902.419,
                litros_vendidos: 123.456,
                preco_litro: 6.38,
                valor_total: 787.65,
                posto_id: 1,
            },
        ];

        expect(paraLeiturasDoDia(respostaDaApi.data, 1, '2026-01-05')).toEqual(esperado);
    });

    it('"787.65" vira exatamente o número 787.65 que o PostgREST entrega — sem arredondar nem escalar', () => {
        const [, comVenda] = paraLeiturasDoDia(respostaDaApi.data, 1, '2026-01-05');

        expect(comVenda?.valor_total).toBe(787.65);
        expect(comVenda?.preco_litro).toBe(6.38);
        expect(comVenda?.litros_vendidos).toBe(123.456);
        expect(comVenda?.leitura_inicial).toBe(1716778.963);
        expect(typeof comVenda?.valor_total).toBe('number');
        expect(typeof comVenda?.leitura_final).toBe('number');
    });

    it('leitura com hora dentro do dia fica fora, como fica no `.eq("data", dia)` do Supabase e no DELETE do Salvar', () => {
        expect(paraLeiturasDoDia(respostaDaApi.data, 1, '2026-01-05').map((l) => l.id)).toEqual([301, 302]);
    });

    it('o recorte do dia é UTC: pedir o dia seguinte não traz a leitura de 23:30Z', () => {
        // Em America/Sao_Paulo (fuso do `bun run test`), 2026-01-05T23:30Z é 20:30 do dia 5. Se
        // alguém comparar em horário local, este caso muda. Nem 06/01 nem 05/01 a devolvem.
        expect(paraLeiturasDoDia(respostaDaApi.data, 1, '2026-01-06')).toEqual([]);
    });

    it('a ordem é por id, não a ordem em que a API manda (bico_id)', () => {
        expect(paraLeiturasDoDia(respostaDaApi.data, 1, '2026-01-05').map((l) => l.bico_id)).toEqual([8, 7]);
    });
});

describe('lerLeiturasDoDiaDaApi', () => {
    it('chama a rota do posto com a data na query e já aplica o recorte do dia', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom(respostaDaApi);

        const lido = await lerLeiturasDoDiaDaApi(1, '2026-01-05');

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/leituras?data=2026-01-05', expect.anything());
        expect(lido.isOk() && lido.value.map((l) => l.id)).toEqual([301, 302]);
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerLeiturasDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('valor_total em número cru é resposta fora do contrato, não dado a converter', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        const [leitura] = respostaDaApi.data;
        respondeCom({ data: [{ ...leitura, valor_total: 787.65 }] });

        const lido = await lerLeiturasDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('401 da rota protegida vira erro http com o status, nunca exceção', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Unauthenticated.' }, 401);

        const lido = await lerLeiturasDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'http', status: 401 });
    });
});
