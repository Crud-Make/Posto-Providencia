import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock('../../../services/supabase', () => ({
    supabase: { from: fromMock },
}));

import React, { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Sinaliza ao React 19 que este ambiente suporta `act(...)` (o que o
// @testing-library faria por nós, se estivesse instalado).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import { useHistoricoFrentista } from './useHistoricoFrentista';
import { HistoricoFrentista } from '../types';

/**
 * Sessão que fecha certo: R$ 100 em dinheiro + R$ 5,50 em moedas + R$ 20 no débito
 * + R$ 30 no crédito. O `valor_conferido` gravado (155,50) inclui os quatro, e o
 * encerrante bateu com ele → `diferenca_calculada = 0`.
 *
 * A soma manual antiga só olhava cartão-legado, nota, pix e dinheiro: dava
 * 100 − 155,50 = −55,50 e marcava "Divergente". É o falso positivo travado aqui.
 */
const LINHA_QUE_BATE = {
    id: 1,
    valor_dinheiro: 100,
    valor_moedas: 5.5,
    valor_pix: 0,
    valor_cartao: 0,
    valor_cartao_debito: 20,
    valor_cartao_credito: 30,
    valor_nota: 0,
    baratao: 0,
    valor_conferido: 155.5,
    diferenca_calculada: 0,
    fechamento: { data: '2026-01-15', turno: { nome: 'Dia' } },
};

/** Falta REAL de caixa, também com moedas e cartão split: conferido 155,50 contra
 *  encerrante 165,50 → `diferenca_calculada = 10` (positivo = FALTA). */
const LINHA_COM_FALTA = {
    id: 2,
    valor_dinheiro: 100,
    valor_moedas: 5.5,
    valor_pix: 0,
    valor_cartao: 0,
    valor_cartao_debito: 20,
    valor_cartao_credito: 30,
    valor_nota: 0,
    baratao: 0,
    valor_conferido: 155.5,
    diferenca_calculada: 10,
    fechamento: { data: '2026-01-16', turno: { nome: 'Dia' } },
};

function buildQuery(linhas: unknown[]) {
    const builder = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        limit: () => Promise.resolve({ data: linhas, error: null }),
    };
    return builder;
}

/** Caixa mutável onde a sonda publica o retorno do hook após cada render. */
interface CaixaDoHook {
    historico: HistoricoFrentista[];
    carregar: ((id: string) => Promise<void>) | null;
}

/** Sonda: renderiza o hook e publica o retorno na caixa num efeito (nunca durante o
 *  render — `react-hooks/globals` proíbe efeito colateral em corpo de componente). */
function Sonda({ caixa }: { caixa: CaixaDoHook }) {
    const { historico, carregarHistorico } = useHistoricoFrentista();

    useEffect(() => {
        caixa.historico = historico;
        caixa.carregar = carregarHistorico;
    }, [caixa, historico, carregarHistorico]);

    return null;
}

/** Monta o hook num root React de verdade e dispara `carregarHistorico`, devolvendo
 *  o histórico já formatado. Sem @testing-library: só react-dom/client + act. */
async function renderizarHistorico(): Promise<HistoricoFrentista[]> {
    const caixa: CaixaDoHook = { historico: [], carregar: null };

    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
        root.render(React.createElement(Sonda, { caixa }));
    });

    await act(async () => {
        await caixa.carregar!('7');
    });

    const historico = caixa.historico;

    await act(async () => {
        root.unmount();
    });

    return historico;
}

describe('useHistoricoFrentista — divergência do histórico do frentista', () => {
    beforeEach(() => {
        fromMock.mockImplementation(() => buildQuery([LINHA_QUE_BATE, LINHA_COM_FALTA]));
    });

    it('não marca como Divergente uma sessão que fecha com moedas, débito e crédito', async () => {
        const historico = await renderizarHistorico();

        const entrada = historico.find(h => h.id === '1');
        expect(entrada?.valor).toBe(0);
        expect(entrada?.status).toBe('OK');
    });

    it('acusa a falta real de caixa com o valor da diferença, não com o resíduo da soma', async () => {
        const historico = await renderizarHistorico();

        const entrada = historico.find(h => h.id === '2');
        expect(entrada?.valor).toBe(10);
        expect(entrada?.status).toBe('Divergente');
    });
});
