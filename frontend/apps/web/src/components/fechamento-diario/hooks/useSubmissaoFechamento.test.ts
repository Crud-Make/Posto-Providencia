import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { SessaoFrentista } from '../../../types/fechamento';
import { montarDiaDeclarado } from './montarDiaDeclarado';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('../../../contexts/usePosto', () => ({
    usePosto: () => ({
        postoAtivoId: 42,
        postos: [],
        postoAtivo: null,
        loading: false,
        error: null,
        setPostoAtivo: vi.fn(),
        setPostoAtivoById: vi.fn(),
        refreshPostos: vi.fn(),
    }),
}));

vi.mock('../../../services/api', () => ({
    fechamentoService: {
        getDoDia: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    leituraService: {
        deleteByDate: vi.fn(),
        bulkCreate: vi.fn(),
    },
    fechamentoFrentistaService: {
        deleteByFechamento: vi.fn(),
        bulkCreate: vi.fn(),
    },
    recebimentoService: {
        deleteByFechamento: vi.fn(),
        bulkCreate: vi.fn(),
    },
}));

import { useSubmissaoFechamento, type SubmissaoParams } from './useSubmissaoFechamento';
import { fechamentoService, fechamentoFrentistaService, leituraService, recebimentoService } from '../../../services/api';

/** Harness mínimo para exercitar um hook fora do @testing-library (não instalado neste projeto). */
function renderHook<T>(useHookFn: () => T) {
    const resultRef: { current: T } = { current: undefined as unknown as T };
    function TestComponent() {
        const value = useHookFn();
        // Reatribuição movida para um efeito: mutar `resultRef.current` direto no corpo
        // do componente acontece durante o render (proibido pela regra
        // react-hooks/immutability); no efeito, roda depois que o render já terminou.
        // `act()` flush os efeitos de forma síncrona no ambiente de teste, então o valor
        // capturado continua disponível imediatamente após cada `act()`.
        React.useEffect(() => {
            resultRef.current = value;
        });
        return null;
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root;
    act(() => {
        root = createRoot(container);
        root.render(React.createElement(TestComponent));
    });
    return { result: resultRef };
}

function sessao(overrides: Partial<SessaoFrentista> = {}): SessaoFrentista {
    return {
        tempId: 't1',
        frentistaId: 1,
        valor_cartao: '0',
        valor_cartao_debito: '0',
        valor_cartao_credito: '0',
        valor_nota: '0',
        valor_pix: '0',
        valor_dinheiro: '0',
        valor_baratao: '0',
        valor_moedas: '0',
        valor_encerrante: '0',
        valor_conferido: '0',
        observacoes: '',
        ...overrides,
    };
}

function params(overrides: Partial<SubmissaoParams> = {}): SubmissaoParams {
    return {
        selectedDate: '2026-07-26',
        bicos: [],
        leituras: {},
        sessoesFrentistas: [sessao()],
        payments: [],
        totalVendas: 0,
        totalFrentistas: 0,
        diferenca: 0,
        podeFechar: true,
        observacoes: '',
        limparAutoSave: vi.fn(),
        ...overrides,
    };
}

/** O primeiro argumento da primeira chamada de um mock, ou `undefined` se não foi chamado. */
function primeiroArgumento(mock: { mock: { calls: unknown[][] } }): unknown {
    return mock.mock.calls[0]?.[0];
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe('useSubmissaoFechamento — caminho legado (sem VITE_API_URL): regressão do bug de moedas fora da gravação de histórico', () => {
    beforeEach(() => {
        // Sem VITE_API_URL o hook grava pelo Supabase — é o caminho da produção até o cutover.
        vi.stubEnv('VITE_API_URL', '');

        // Zera só o histórico de chamadas entre os testes — sem isto o `toHaveBeenCalledTimes(1)`
        // do segundo caso conta as chamadas do primeiro. As implementações não são afetadas
        // (isso seria `resetAllMocks`), então os `mockResolvedValue` abaixo seguem valendo.
        vi.clearAllMocks();

        vi.mocked(fechamentoService.getDoDia).mockResolvedValue({
            success: false,
            error: 'não encontrado',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString(),
        });
        // A exclusão das leituras do dia roda SEMPRE, exista ou não `Fechamento` para a data
        // — inclusive neste cenário, em que `getDoDia` devolve NOT_FOUND. Sem este
        // retorno o mock resolve `undefined`, a submissão aborta e nada chega ao `bulkCreate`.
        vi.mocked(leituraService.deleteByDate).mockResolvedValue({
            success: true,
            data: undefined,
            timestamp: new Date().toISOString(),
        });
        vi.mocked(fechamentoService.create).mockResolvedValue({
            success: true,
            data: { id: 123 } as never,
            timestamp: new Date().toISOString(),
        });
        vi.mocked(fechamentoService.update).mockResolvedValue({
            success: true,
            data: {} as never,
            timestamp: new Date().toISOString(),
        });
        vi.mocked(fechamentoFrentistaService.bulkCreate).mockResolvedValue({
            success: true,
            data: [],
            timestamp: new Date().toISOString(),
        });
    });

    it('persiste valor_moedas e calcula a diferença considerando moedas', async () => {
        const { result } = renderHook(() => useSubmissaoFechamento());

        // Frentista recebeu R$200 em moedas e nada mais; sem encerrante batido,
        // valor_conferido cai no fallback do totalInformado.
        const sessaoComMoedas = sessao({ valor_moedas: '200,00' });

        await act(async () => {
            await result.current.handleSave(params({ sessoesFrentistas: [sessaoComMoedas], totalFrentistas: 200 }));
        });

        expect(fechamentoFrentistaService.bulkCreate).toHaveBeenCalledTimes(1);
        const payloadEnviado = primeiroArgumento(vi.mocked(fechamentoFrentistaService.bulkCreate));
        const registroFrentista = Array.isArray(payloadEnviado) ? (payloadEnviado[0] as Record<string, unknown>) : undefined;

        expect(registroFrentista?.valor_moedas).toBe(200);
        expect(registroFrentista?.valor_conferido).toBe(200);
    });

    // Trava o valor literal 1, de propósito: `Usuario` tem uma única linha no banco (id=1) e
    // `Fechamento.usuario_id` é FK para ela. Comparar com a constante importada não serviria —
    // mudar a constante mudaria os dois lados juntos e o teste seguiria verde enquanto a FK
    // quebra em produção.
    it('grava o fechamento com usuario_id = 1', async () => {
        const { result } = renderHook(() => useSubmissaoFechamento());

        await act(async () => {
            await result.current.handleSave(params());
        });

        expect(fechamentoService.create).toHaveBeenCalledTimes(1);
        const payloadFechamento = primeiroArgumento(vi.mocked(fechamentoService.create)) as { usuario_id?: number } | undefined;
        expect(payloadFechamento?.usuario_id).toBe(1);
    });

    // Regressão do bug que dobrava os litros de um dia histórico (31/07/2026).
    // `getDoDia` devolve NOT_FOUND neste `beforeEach` — o caso do dia antigo, que não
    // tem `Fechamento`. Antes, a exclusão das leituras morava dentro do ramo "fechamento existe",
    // então esse caminho inseria por cima das leituras já gravadas e o dia ficava com o dobro.
    it('apaga as leituras do dia mesmo quando não existe fechamento para a data', async () => {
        const { result } = renderHook(() => useSubmissaoFechamento());

        await act(async () => {
            await result.current.handleSave(params({ selectedDate: '2026-07-10' }));
        });

        expect(leituraService.deleteByDate).toHaveBeenCalledTimes(1);
        // [16/08] Assinatura sem turno: apagar o dia inteiro, não o recorte por turno.
        // O `1` que ficava no meio era o turno, e era ele que deixava a linha do outro
        // app (turno nulo) sobreviver ao delete.
        expect(leituraService.deleteByDate).toHaveBeenCalledWith('2026-07-10', 42);
    });

    // A trava de 7 dias da RLS recusa apagar dia antigo, e um DELETE filtrado pela RLS não vira
    // erro do Supabase — o serviço é quem detecta contando o que sobrou. Seguir gravando depois
    // disso era o que duplicava o dia.
    it('aborta antes de gravar quando a exclusão das leituras é recusada', async () => {
        vi.mocked(leituraService.deleteByDate).mockResolvedValue({
            success: false,
            error: 'a proteção do banco só permite excluir os últimos 7 dias',
            code: 'DELETE_BLOQUEADO',
            timestamp: new Date().toISOString(),
        });

        const { result } = renderHook(() => useSubmissaoFechamento());

        await act(async () => {
            await result.current.handleSave(params({ selectedDate: '2026-07-10' }));
        });

        // Nada pode ter sido criado nem gravado — nem o fechamento, nem as sessões.
        expect(fechamentoService.create).not.toHaveBeenCalled();
        expect(fechamentoFrentistaService.bulkCreate).not.toHaveBeenCalled();
        expect(result.current.error).toContain('7 dias');
    });
});

describe('useSubmissaoFechamento — caminho da API (com VITE_API_URL, #103 P11)', () => {
    /** Forma real da resposta 200 do PUT (`FechamentoResource.php`), o mesmo shape do GET. */
    const fechamentoGravado = {
        id: 501,
        data: '2026-07-26T00:00:00Z',
        total_vendas: null,
        total_recebido: '200.00',
        diferenca: null,
        status: 'FECHADO',
        observacoes: null,
        usuario_id: 7,
        turno_id: 1,
        recebimentos: [],
    };

    function respondeCom(corpo: unknown, status = 200): void {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
    }

    beforeEach(() => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:8000');
        vi.clearAllMocks();
    });

    it('nenhum service do Supabase é chamado, e o PUT sai UMA vez com o corpo de montarDiaDeclarado', async () => {
        respondeCom({ data: fechamentoGravado });
        const { result } = renderHook(() => useSubmissaoFechamento());
        const entrada = params({ sessoesFrentistas: [sessao({ valor_moedas: '200,00' })], totalFrentistas: 200 });

        await act(async () => {
            await result.current.handleSave(entrada);
        });

        expect(leituraService.deleteByDate).toHaveBeenCalledTimes(0);
        expect(fechamentoService.getDoDia).toHaveBeenCalledTimes(0);
        expect(fechamentoService.create).toHaveBeenCalledTimes(0);
        expect(fechamentoService.update).toHaveBeenCalledTimes(0);
        expect(fechamentoFrentistaService.bulkCreate).toHaveBeenCalledTimes(0);
        expect(fechamentoFrentistaService.deleteByFechamento).toHaveBeenCalledTimes(0);
        expect(recebimentoService.bulkCreate).toHaveBeenCalledTimes(0);
        expect(recebimentoService.deleteByFechamento).toHaveBeenCalledTimes(0);

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('http://localhost:8000/api/postos/42/fechamento?data=2026-07-26', expect.anything());
        const init: unknown = vi.mocked(fetch).mock.calls[0]?.[1];
        const requisicao = typeof init === 'object' && init !== null ? (init as RequestInit) : {};
        expect(requisicao.method).toBe('PUT');
        expect(requisicao.body).toBe(JSON.stringify(montarDiaDeclarado(entrada)));

        expect(result.current.error).toBeNull();
        expect(result.current.success).toBe('Fechamento realizado com sucesso!');
        expect(entrada.limparAutoSave).toHaveBeenCalledTimes(1);
    });

    it('recusa 422 do servidor vira a mensagem de erro na tela, sem sucesso e sem limpar o auto-save', async () => {
        respondeCom({ erro: { codigo: 'totais_inconsistentes', mensagem: 'diferenca tem de ser total_vendas − total_recebido.' } }, 422);
        const { result } = renderHook(() => useSubmissaoFechamento());
        const entrada = params();

        await act(async () => {
            await result.current.handleSave(entrada);
        });

        expect(result.current.error).toBe('Gravação recusada (totais_inconsistentes): diferenca tem de ser total_vendas − total_recebido.');
        expect(result.current.success).toBeNull();
        expect(result.current.saving).toBe(false);
        expect(entrada.limparAutoSave).not.toHaveBeenCalled();
    });

    it('403 (sem gerir) vira erro http na tela', async () => {
        respondeCom({ message: 'Sem acesso a este posto.' }, 403);
        const { result } = renderHook(() => useSubmissaoFechamento());

        await act(async () => {
            await result.current.handleSave(params());
        });

        expect(result.current.error).toBe('API Laravel respondeu 403');
    });
});
