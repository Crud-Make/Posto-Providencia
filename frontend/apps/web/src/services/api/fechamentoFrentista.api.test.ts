import { afterEach, describe, expect, it, vi } from 'vitest';
import { lerSessoesDoDiaDaApi, paraSessoesDoDia, type SessaoDoDia } from './fechamentoFrentista.api';

/**
 * Forma real de `GET /api/postos/1/sessoes?data=2026-01-05` (`FechamentoFrentistaResource.php`),
 * na ordem da API (por `frentista_id`), que não é a do Supabase (física, por `id`). A segunda
 * sessão é o envio sem baldes opcionais — cada um deles `null`, que é "não informou" (I8).
 */
const respostaDaApi = {
    data: [
        {
            id: 402,
            fechamento_id: 77,
            frentista_id: 9,
            valor_dinheiro: '500.00',
            valor_cartao: '0.00',
            valor_cartao_debito: null,
            valor_cartao_credito: null,
            valor_pix: '0.00',
            valor_nota: '0.00',
            valor_moedas: '0.00',
            baratao: null,
            baratencia: null,
            valor_conferido: '500.00',
            encerrante: null,
            diferenca_calculada: null,
            observacoes: null,
            data_hora_envio: null,
        },
        {
            id: 401,
            fechamento_id: 77,
            frentista_id: 12,
            valor_dinheiro: '1234.56',
            valor_cartao: '0.00',
            valor_cartao_debito: '250.00',
            valor_cartao_credito: '100.50',
            valor_pix: '89.90',
            valor_nota: '0.00',
            valor_moedas: '3.25',
            baratao: '12.00',
            baratencia: '0.00',
            valor_conferido: '1690.21',
            encerrante: '1702.21',
            diferenca_calculada: '-12.00',
            observacoes: '[CONFERIDO] tudo certo',
            data_hora_envio: '2026-01-05T14:03:22Z',
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

describe('paraSessoesDoDia', () => {
    it('devolve a mesma forma que o Supabase entrega hoje: números, null onde era null, ordem por id', () => {
        // O literal é tipado como `SessaoDoDia` de propósito: se o tipo ganhar campo obrigatório
        // novo, este teste deixa de compilar.
        const esperado: SessaoDoDia[] = [
            {
                id: 401,
                fechamento_id: 77,
                frentista_id: 12,
                valor_cartao: 0,
                valor_cartao_debito: 250,
                valor_cartao_credito: 100.5,
                valor_moedas: 3.25,
                valor_dinheiro: 1234.56,
                valor_pix: 89.9,
                valor_nota: 0,
                valor_conferido: 1690.21,
                observacoes: '[CONFERIDO] tudo certo',
                posto_id: 1,
                encerrante: 1702.21,
                diferenca_calculada: -12,
                baratao: 12,
                data_hora_envio: '2026-01-05T14:03:22Z',
            },
            {
                id: 402,
                fechamento_id: 77,
                frentista_id: 9,
                valor_cartao: 0,
                valor_cartao_debito: null,
                valor_cartao_credito: null,
                valor_moedas: 0,
                valor_dinheiro: 500,
                valor_pix: 0,
                valor_nota: 0,
                valor_conferido: 500,
                observacoes: null,
                posto_id: 1,
                encerrante: null,
                diferenca_calculada: null,
                baratao: null,
                data_hora_envio: null,
            },
        ];

        expect(paraSessoesDoDia(respostaDaApi.data, 1)).toEqual(esperado);
    });

    it('"1234.56" vira exatamente o número 1234.56 que o PostgREST entrega — sem arredondar nem escalar', () => {
        const [completa] = paraSessoesDoDia(respostaDaApi.data, 1);

        expect(completa?.valor_dinheiro).toBe(1234.56);
        expect(completa?.valor_conferido).toBe(1690.21);
        expect(completa?.diferenca_calculada).toBe(-12);
        expect(typeof completa?.valor_dinheiro).toBe('number');
        expect(typeof completa?.encerrante).toBe('number');
    });

    it('I8: balde null continua null — NUNCA 0. "0.00" é que vira 0, e os dois são distinguíveis', () => {
        // `Number(null)` é 0: uma conversão distraída faz "não informou" virar "informou zero".
        // `toBeNull` reprova o 0; o `not.toBe(0)` diz em voz alta o que está sendo negado.
        const [, semBaldes] = paraSessoesDoDia(respostaDaApi.data, 1);

        expect(semBaldes?.encerrante).toBeNull();
        expect(semBaldes?.baratao).toBeNull();
        expect(semBaldes?.valor_cartao_debito).toBeNull();
        expect(semBaldes?.valor_cartao_credito).toBeNull();
        expect(semBaldes?.diferenca_calculada).toBeNull();
        expect(semBaldes?.encerrante).not.toBe(0);

        // O balde informado como zero é zero — e não null, nem NaN.
        expect(semBaldes?.valor_cartao).toBe(0);
        expect(semBaldes?.valor_pix).toBe(0);
    });

    it('a ordem é por id (a ordem física do Supabase, de quem enviou primeiro), não a da API (frentista_id)', () => {
        expect(paraSessoesDoDia(respostaDaApi.data, 1).map((s) => s.id)).toEqual([401, 402]);
        expect(paraSessoesDoDia(respostaDaApi.data, 1).map((s) => s.frentista_id)).toEqual([12, 9]);
    });

    it('data_hora_envio passa como a API manda: o carimbo do PWA em Zulu, ou null quando o envio não veio do app', () => {
        const [completa, semBaldes] = paraSessoesDoDia(respostaDaApi.data, 1);

        expect(completa?.data_hora_envio).toBe('2026-01-05T14:03:22Z');
        expect(semBaldes?.data_hora_envio).toBeNull();
    });

    it('observacoes null fica null (o hook é quem troca por string vazia) e posto_id vem da rota', () => {
        const [, semBaldes] = paraSessoesDoDia(respostaDaApi.data, 7);

        expect(semBaldes?.observacoes).toBeNull();
        expect(semBaldes?.posto_id).toBe(7);
    });
});

describe('lerSessoesDoDiaDaApi', () => {
    it('chama a rota do posto com a data na query e devolve as sessões por id', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom(respostaDaApi);

        const lido = await lerSessoesDoDiaDaApi(1, '2026-01-05');

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/sessoes?data=2026-01-05', expect.anything());
        expect(lido.isOk() && lido.value.map((s) => s.id)).toEqual([401, 402]);
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerSessoesDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('valor_dinheiro em número cru é resposta fora do contrato, não dado a converter', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        const [sessao] = respostaDaApi.data;
        respondeCom({ data: [{ ...sessao, valor_dinheiro: 500 }] });

        const lido = await lerSessoesDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('encerrante em 0 cru (o servidor trocando null por zero) também é fora do contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        const [sessao] = respostaDaApi.data;
        respondeCom({ data: [{ ...sessao, encerrante: 0 }] });

        const lido = await lerSessoesDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('401 da rota protegida vira erro http com o status, nunca exceção', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Unauthenticated.' }, 401);

        const lido = await lerSessoesDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'http', status: 401 });
    });
});
