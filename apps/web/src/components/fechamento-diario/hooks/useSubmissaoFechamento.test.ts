import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { SessaoFrentista } from '../../../types/fechamento';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
        getByDateAndTurno: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    leituraService: {
        deleteByShift: vi.fn(),
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

import { useSubmissaoFechamento } from './useSubmissaoFechamento';
import { fechamentoService, fechamentoFrentistaService, leituraService } from '../../../services/api';

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

describe('useSubmissaoFechamento — regressão do bug de moedas fora da gravação de histórico', () => {
    beforeEach(() => {
        // Zera só o histórico de chamadas entre os testes — sem isto o `toHaveBeenCalledTimes(1)`
        // do segundo caso conta as chamadas do primeiro. As implementações não são afetadas
        // (isso seria `resetAllMocks`), então os `mockResolvedValue` abaixo seguem valendo.
        vi.clearAllMocks();

        vi.mocked(fechamentoService.getByDateAndTurno).mockResolvedValue({
            success: false,
            error: 'não encontrado',
            code: 'NOT_FOUND',
            timestamp: new Date().toISOString(),
        });
        // A exclusão das leituras do dia roda SEMPRE, exista ou não `Fechamento` para a data
        // — inclusive neste cenário, em que `getByDateAndTurno` devolve NOT_FOUND. Sem este
        // retorno o mock resolve `undefined`, a submissão aborta e nada chega ao `bulkCreate`.
        vi.mocked(leituraService.deleteByShift).mockResolvedValue({
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
            await result.current.handleSave({
                selectedDate: '2026-07-26',
                selectedTurno: 1,
                bicos: [],
                leituras: {},
                sessoesFrentistas: [sessaoComMoedas],
                payments: [],
                totalVendas: 0,
                totalFrentistas: 200,
                diferenca: 0,
                podeFechar: true,
                observacoes: '',
                limparAutoSave: vi.fn(),
            });
        });

        expect(fechamentoFrentistaService.bulkCreate).toHaveBeenCalledTimes(1);
        const [payloadEnviado] = vi.mocked(fechamentoFrentistaService.bulkCreate).mock.calls[0];
        const registroFrentista = payloadEnviado[0] as Record<string, unknown>;

        expect(registroFrentista.valor_moedas).toBe(200);
        expect(registroFrentista.valor_conferido).toBe(200);
    });

    // Trava o valor literal 1, de propósito: `Usuario` tem uma única linha no banco (id=1) e
    // `Fechamento.usuario_id` é FK para ela. Comparar com a constante importada não serviria —
    // mudar a constante mudaria os dois lados juntos e o teste seguiria verde enquanto a FK
    // quebra em produção.
    it('grava o fechamento com usuario_id = 1', async () => {
        const { result } = renderHook(() => useSubmissaoFechamento());

        await act(async () => {
            await result.current.handleSave({
                selectedDate: '2026-07-26',
                selectedTurno: 1,
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
            });
        });

        expect(fechamentoService.create).toHaveBeenCalledTimes(1);
        const [payloadFechamento] = vi.mocked(fechamentoService.create).mock.calls[0];
        expect(payloadFechamento.usuario_id).toBe(1);
    });

    // Regressão do bug que dobrava os litros de um dia histórico (31/07/2026).
    // `getByDateAndTurno` devolve NOT_FOUND neste `beforeEach` — o caso do dia antigo, que não
    // tem `Fechamento`. Antes, a exclusão das leituras morava dentro do ramo "fechamento existe",
    // então esse caminho inseria por cima das leituras já gravadas e o dia ficava com o dobro.
    it('apaga as leituras do dia mesmo quando não existe fechamento para a data', async () => {
        const { result } = renderHook(() => useSubmissaoFechamento());

        await act(async () => {
            await result.current.handleSave({
                selectedDate: '2026-07-10',
                selectedTurno: 1,
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
            });
        });

        expect(leituraService.deleteByShift).toHaveBeenCalledTimes(1);
        expect(leituraService.deleteByShift).toHaveBeenCalledWith('2026-07-10', 1, 42);
    });

    // A trava de 7 dias da RLS recusa apagar dia antigo, e um DELETE filtrado pela RLS não vira
    // erro do Supabase — o serviço é quem detecta contando o que sobrou. Seguir gravando depois
    // disso era o que duplicava o dia.
    it('aborta antes de gravar quando a exclusão das leituras é recusada', async () => {
        vi.mocked(leituraService.deleteByShift).mockResolvedValue({
            success: false,
            error: 'a proteção do banco só permite excluir os últimos 7 dias',
            code: 'DELETE_BLOQUEADO',
            timestamp: new Date().toISOString(),
        });

        const { result } = renderHook(() => useSubmissaoFechamento());

        await act(async () => {
            await result.current.handleSave({
                selectedDate: '2026-07-10',
                selectedTurno: 1,
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
            });
        });

        // Nada pode ter sido criado nem gravado — nem o fechamento, nem as sessões.
        expect(fechamentoService.create).not.toHaveBeenCalled();
        expect(fechamentoFrentistaService.bulkCreate).not.toHaveBeenCalled();
        expect(result.current.error).toContain('7 dias');
    });
});
