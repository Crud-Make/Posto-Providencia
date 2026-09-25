import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    diaDeclarado,
    gravarFechamentoDoDiaNaApi,
    lerFechamentoDoDiaDaApi,
    paraFechamentoDoDia,
    type DiaDeclarado,
    type FechamentoDaApi,
    type FechamentoDoDia,
} from './fechamento.api';

/**
 * Forma real de `GET /api/postos/1/fechamento?data=2026-01-05` (`FechamentoResource.php` +
 * `RecebimentoResource.php`): o dia apurado, com dois recebimentos na ordem física (que não é a
 * de `id`). `turno_id` null é o caso real de produção (o tampão da migração).
 */
const fechamentoApurado: FechamentoDaApi = {
    id: 77,
    data: '2026-01-05T00:00:00Z',
    total_vendas: '3126.21',
    total_recebido: '3120.00',
    diferenca: '6.21',
    status: 'FECHADO',
    observacoes: null,
    usuario_id: 1,
    turno_id: null,
    recebimentos: [
        { id: 902, fechamento_id: 77, forma_pagamento_id: 2, maquininha_id: null, valor: '2436.00', observacoes: null },
        { id: 901, fechamento_id: 77, forma_pagamento_id: 7, maquininha_id: 3, valor: '684.00', observacoes: 'maquininha Stone' },
    ],
};

/** O dia que o PWA abriu e ninguém apurou: os dois totais em null (I8), `total_recebido` em zero, sem recebimento. */
const fechamentoNaoApurado: FechamentoDaApi = {
    id: 78,
    data: '2026-01-06T00:00:00Z',
    total_vendas: null,
    total_recebido: '0.00',
    diferenca: null,
    status: 'RASCUNHO',
    observacoes: 'aberto pelo PWA',
    usuario_id: 1,
    turno_id: 1,
    recebimentos: [],
};

function respondeCom(corpo: unknown, status = 200): void {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('paraFechamentoDoDia', () => {
    it('devolve a mesma forma que getDoDia + getWithDetails entregam hoje: números, recebimentos por id, posto da rota', () => {
        // O literal é tipado como `FechamentoDoDia` de propósito: se o tipo ganhar campo obrigatório
        // novo, este teste deixa de compilar.
        const esperado: FechamentoDoDia = {
            id: 77,
            data: '2026-01-05T00:00:00Z',
            usuario_id: 1,
            turno_id: null,
            status: 'FECHADO',
            total_vendas: 3126.21,
            total_recebido: 3120,
            diferenca: 6.21,
            observacoes: null,
            posto_id: 1,
            recebimentos: [
                { id: 901, fechamento_id: 77, forma_pagamento_id: 7, maquininha_id: 3, valor: 684, observacoes: 'maquininha Stone' },
                { id: 902, fechamento_id: 77, forma_pagamento_id: 2, maquininha_id: null, valor: 2436, observacoes: null },
            ],
        };

        expect(paraFechamentoDoDia(fechamentoApurado, 1)).toEqual(esperado);
    });

    it('"2436.00" vira exatamente o número 2436 que o PostgREST entrega — sem arredondar nem escalar', () => {
        const lido = paraFechamentoDoDia(fechamentoApurado, 1);

        expect(lido.total_vendas).toBe(3126.21);
        expect(lido.diferenca).toBe(6.21);
        expect(lido.recebimentos[1]?.valor).toBe(2436);
        expect(typeof lido.total_recebido).toBe('number');
        expect(typeof lido.recebimentos[0]?.valor).toBe('number');
    });

    it('I8: total_vendas e diferenca null continuam null — NUNCA 0. "0.00" é que vira 0, e os dois são distinguíveis', () => {
        // `Number(null)` é 0: uma conversão distraída faz "ninguém apurou" virar "apurou e deu
        // zero". `toBeNull` reprova o 0; o `not.toBe(0)` diz em voz alta o que está sendo negado.
        const naoApurado = paraFechamentoDoDia(fechamentoNaoApurado, 1);

        expect(naoApurado.total_vendas).toBeNull();
        expect(naoApurado.diferenca).toBeNull();
        expect(naoApurado.total_vendas).not.toBe(0);
        expect(naoApurado.diferenca).not.toBe(0);

        // O total informado como zero é zero — e não null, nem NaN.
        expect(naoApurado.total_recebido).toBe(0);
        expect(naoApurado.recebimentos).toEqual([]);
    });

    it('os recebimentos saem por id, não na ordem em que a API os mandou', () => {
        expect(paraFechamentoDoDia(fechamentoApurado, 1).recebimentos.map((r) => r.id)).toEqual([901, 902]);
        expect(paraFechamentoDoDia(fechamentoApurado, 1).recebimentos.map((r) => r.forma_pagamento_id)).toEqual([7, 2]);
    });

    it('status passa como o literal do enum, turno_id null fica null, posto_id vem da rota', () => {
        const lido = paraFechamentoDoDia(fechamentoNaoApurado, 7);

        expect(lido.status).toBe('RASCUNHO');
        expect(paraFechamentoDoDia(fechamentoApurado, 7).turno_id).toBeNull();
        expect(lido.turno_id).toBe(1);
        expect(lido.posto_id).toBe(7);
        expect(lido.observacoes).toBe('aberto pelo PWA');
    });
});

describe('lerFechamentoDoDiaDaApi', () => {
    it('chama a rota do posto com a data na query e devolve o fechamento com os recebimentos por id', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000/');
        respondeCom({ data: fechamentoApurado });

        const lido = await lerFechamentoDoDiaDaApi(1, '2026-01-05');

        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/fechamento?data=2026-01-05', expect.anything());
        expect(lido.isOk() && lido.value?.id).toBe(77);
        expect(lido.isOk() && lido.value?.recebimentos.map((r) => r.id)).toEqual([901, 902]);
    });

    it('dia sem fechamento é Ok(null), NUNCA Err: "ainda não fecharam" é resposta legítima do domínio', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: null });

        const lido = await lerFechamentoDoDiaDaApi(1, '2026-01-05');

        expect(lido.isOk()).toBe(true);
        expect(lido.isOk() && lido.value).toBeNull();
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const lido = await lerFechamentoDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('total_vendas em 0 cru (o servidor trocando null por zero) é fora do contrato, não dado a converter', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: { ...fechamentoNaoApurado, total_vendas: 0 } });

        const lido = await lerFechamentoDoDiaDaApi(1, '2026-01-06');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('valor do recebimento em número cru também é fora do contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        const [primeiro] = fechamentoApurado.recebimentos;
        respondeCom({ data: { ...fechamentoApurado, recebimentos: [{ ...primeiro, valor: 2436 }] } });

        const lido = await lerFechamentoDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('status fora dos três literais do enum é fora do contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: { ...fechamentoApurado, status: 'fechado' } });

        const lido = await lerFechamentoDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('resposta sem a chave recebimentos (relação não carregada) é fora do contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        const { recebimentos: _semRecebimentos, ...semRelacao } = fechamentoApurado;
        respondeCom({ data: semRelacao });

        const lido = await lerFechamentoDoDiaDaApi(1, '2026-01-05');

        expect(lido.isErr() && lido.error.tipo).toBe('formato');
    });

    it('401 da rota protegida vira erro http com o status, nunca exceção — e 404 também é erro, não dia vazio', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Unauthenticated.' }, 401);
        const naoAutenticado = await lerFechamentoDoDiaDaApi(1, '2026-01-05');
        expect(naoAutenticado.isErr() && naoAutenticado.error).toEqual({ tipo: 'http', status: 401 });

        // O backend nunca responde 404 para dia sem fechamento (é 200 com data null); um 404 é
        // rota errada ou posto inexistente, e não pode virar "dia vazio" em silêncio.
        respondeCom({ message: 'Not Found' }, 404);
        const naoEncontrado = await lerFechamentoDoDiaDaApi(1, '2026-01-05');
        expect(naoEncontrado.isErr() && naoEncontrado.error).toEqual({ tipo: 'http', status: 404 });
    });
});

/**
 * Um dia coerente, já no contrato: 100 L a R$ 6,00, uma sessão de R$ 600,00 em dinheiro, um
 * recebimento, totais que batem. Tipado como `DiaDeclarado` de propósito: campo novo obrigatório
 * no contrato deixa este teste de compilar.
 */
const diaCoerente: DiaDeclarado = {
    leituras: [
        { bico_id: 3, combustivel_id: 2, leitura_inicial: '1000.000', leitura_final: '1100.000', litros_vendidos: '100.000', preco_litro: '6.00', valor_total: '600.00' },
    ],
    sessoes: [
        {
            frentista_id: 9,
            valor_cartao: '0.00', valor_cartao_debito: '0.00', valor_cartao_credito: '0.00',
            valor_dinheiro: '600.00', valor_moedas: '0.00', valor_pix: '0.00', valor_nota: '0.00', baratao: '0.00',
            encerrante: '600.00', valor_conferido: '600.00', diferenca_calculada: '0.00', observacoes: '',
        },
    ],
    frentistas_conhecidos: [9, 10],
    recebimentos: [{ forma_pagamento_id: 4, valor: '600.00' }],
    totais: { total_vendas: '600.00', total_recebido: '600.00', diferenca: '0.00' },
    observacoes: 'gravado pela API',
};

describe('diaDeclarado — o espelho TS das rules do FormRequest', () => {
    it('aceita o dia coerente e o dia não apurado (par null)', () => {
        expect(diaDeclarado.safeParse(diaCoerente).success).toBe(true);
        expect(diaDeclarado.safeParse({ ...diaCoerente, totais: { total_vendas: null, total_recebido: '600.00', diferenca: null } }).success).toBe(true);
    });

    it('recusa dinheiro em número, string BR, uma casa só e litros com duas casas', () => {
        const [sessao] = diaCoerente.sessoes;
        const [leitura] = diaCoerente.leituras;
        expect(diaDeclarado.safeParse({ ...diaCoerente, sessoes: [{ ...sessao, valor_dinheiro: 600 }] }).success).toBe(false);
        expect(diaDeclarado.safeParse({ ...diaCoerente, totais: { ...diaCoerente.totais, total_recebido: '1.718,35' } }).success).toBe(false);
        expect(diaDeclarado.safeParse({ ...diaCoerente, recebimentos: [{ forma_pagamento_id: 4, valor: '600.0' }] }).success).toBe(false);
        expect(diaDeclarado.safeParse({ ...diaCoerente, leituras: [{ ...leitura, litros_vendidos: '100.00' }] }).success).toBe(false);
    });

    it('recusa o par quebrado: total_vendas presente com diferenca null, e o contrário', () => {
        expect(diaDeclarado.safeParse({ ...diaCoerente, totais: { total_vendas: '600.00', total_recebido: '600.00', diferenca: null } }).success).toBe(false);
        expect(diaDeclarado.safeParse({ ...diaCoerente, totais: { total_vendas: null, total_recebido: '600.00', diferenca: '0.00' } }).success).toBe(false);
    });

    it('recusa lista ausente e id como string', () => {
        const { leituras: _semLeituras, ...semLista } = diaCoerente;
        expect(diaDeclarado.safeParse(semLista).success).toBe(false);
        expect(diaDeclarado.safeParse({ ...diaCoerente, frentistas_conhecidos: ['9'] }).success).toBe(false);
    });
});

describe('gravarFechamentoDoDiaNaApi', () => {
    it('faz PUT na rota do posto com a data na query e o corpo serializado exatamente como o contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: fechamentoApurado });

        const enviado = await gravarFechamentoDoDiaNaApi(1, '2026-01-05', diaCoerente);

        expect(enviado.isOk()).toBe(true);
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/1/fechamento?data=2026-01-05', expect.anything());
        const enviada: unknown = vi.mocked(fetch).mock.calls[0]?.[1];
        const init = typeof enviada === 'object' && enviada !== null ? (enviada as RequestInit) : {};
        expect(init.method).toBe('PUT');
        // O JSON que sai, byte a byte: string decimal continua string, null continua null.
        expect(init.body).toBe(
            '{"leituras":[{"bico_id":3,"combustivel_id":2,"leitura_inicial":"1000.000","leitura_final":"1100.000","litros_vendidos":"100.000","preco_litro":"6.00","valor_total":"600.00"}],'
                + '"sessoes":[{"frentista_id":9,"valor_cartao":"0.00","valor_cartao_debito":"0.00","valor_cartao_credito":"0.00","valor_dinheiro":"600.00","valor_moedas":"0.00","valor_pix":"0.00","valor_nota":"0.00","baratao":"0.00","encerrante":"600.00","valor_conferido":"600.00","diferenca_calculada":"0.00","observacoes":""}],'
                + '"frentistas_conhecidos":[9,10],'
                + '"recebimentos":[{"forma_pagamento_id":4,"valor":"600.00"}],'
                + '"totais":{"total_vendas":"600.00","total_recebido":"600.00","diferenca":"0.00"},'
                + '"observacoes":"gravado pela API"}',
        );
    });

    it('a resposta 200 vira o MESMO Fechamento que lerFechamentoDoDiaDaApi devolve', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ data: fechamentoApurado });

        const gravado = await gravarFechamentoDoDiaNaApi(1, '2026-01-05', diaCoerente);

        expect(gravado.isOk() && gravado.value).toEqual(paraFechamentoDoDia(fechamentoApurado, 1));
    });

    it('422 do servidor vira Err recusado com o código — de forma ou de domínio', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ erro: { codigo: 'totais_inconsistentes', mensagem: 'diferenca tem de ser total_vendas − total_recebido.' } }, 422);

        const recusado = await gravarFechamentoDoDiaNaApi(1, '2026-01-05', diaCoerente);

        expect(recusado.isErr() && recusado.error).toEqual({
            tipo: 'recusado', status: 422, codigo: 'totais_inconsistentes', mensagem: 'diferenca tem de ser total_vendas − total_recebido.',
        });
    });

    it('403 (sem gerir) é erro http, e data null na resposta do PUT é fora do contrato', async () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        respondeCom({ message: 'Sem acesso a este posto.' }, 403);
        const semGerir = await gravarFechamentoDoDiaNaApi(1, '2026-01-05', diaCoerente);
        expect(semGerir.isErr() && semGerir.error).toEqual({ tipo: 'http', status: 403 });

        respondeCom({ data: null });
        const semDia = await gravarFechamentoDoDiaNaApi(1, '2026-01-05', diaCoerente);
        expect(semDia.isErr() && semDia.error.tipo).toBe('formato');
    });

    it('sem VITE_API_URL devolve sem_api e não chama a rede', async () => {
        vi.stubEnv('VITE_API_URL', '');
        vi.stubGlobal('fetch', vi.fn());

        const resultado = await gravarFechamentoDoDiaNaApi(1, '2026-01-05', diaCoerente);

        expect(resultado.isErr() && resultado.error).toEqual({ tipo: 'sem_api' });
        expect(fetch).not.toHaveBeenCalled();
    });
});
