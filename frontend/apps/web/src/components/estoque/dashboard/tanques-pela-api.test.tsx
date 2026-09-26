import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Tela "Tanques (Combustível)" 100% pela API — prova de ponta a ponta (#103, painel-pela-api.md §11).
 *
 * A TELA INTEIRA é montada no modo API (`VITE_API_URL` + `VITE_API_LOGIN=1`, que não cria sessão do
 * Supabase): lê os tanques, a régua, o movimento, as despesas e o histórico, o gerente abre a
 * "Nova Medição (Régua)", escolhe o tanque, digita e confirma. Qualquer toque no client do Supabase
 * — `from`, `rpc`, `auth`, o que for — reprova: o Proxy abaixo registra e lança.
 */
const { toqueNoSupabase } = vi.hoisted(() => ({ toqueNoSupabase: vi.fn() }));
vi.mock('../../../services/supabase', () => ({
    supabase: new Proxy(
        {},
        {
            get: (_alvo, chave) => {
                toqueNoSupabase(String(chave));
                throw new Error(`Supabase tocado: ${String(chave)}`);
            },
        },
    ),
}));

const { POSTO } = vi.hoisted(() => ({
    POSTO: { postoAtivoId: 1, postoAtivo: { id: 1, nome: 'Posto Jorro' }, postos: [], setPostoAtivoById: (): void => undefined },
}));
vi.mock('../../../contexts/usePosto', () => ({ usePosto: () => POSTO }));

import TelaDashboardEstoque from './index.tsx';

const PAINEL = {
    mes: { inicio: '2026-09-01', fim: '2026-09-30' },
    movimento_desde: '2026-09-01',
    tanques: [
        { id: 10, nome: 'Tanque GC', combustivel_id: 1, capacidade: '15000.00',
            combustivel: { nome: 'Gasolina Comum', codigo: 'GC', preco_venda: '6.50', preco_custo: '5.50' } },
    ],
    reguas: [{ tanque_id: 10, data: '2026-09-18', volume_fisico: '8000.50' }],
    compras: [{ combustivel_id: 1, data: '2026-09-20', quantidade_litros: '1000.00' }],
    vendas: [{ combustivel_id: 1, data: '2026-09-21', litros_vendidos: '500.250' }],
    despesas: [{ data: '2026-09-05', valor: '1000.50' }],
    historico: [{ id: 1, tanque_id: 10, data: '2026-09-18', volume_livro: null, volume_fisico: '8000.50' }],
};

const json = (corpo: unknown, status = 200): Response => new Response(JSON.stringify(corpo), { status });

function apiFalsa(corposDoPut: unknown[], respostaDoPut: () => Response) {
    return vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(entrada));
        if (init?.method === 'PUT' && url.pathname === '/api/postos/1/tanques/medicoes') {
            corposDoPut.push(JSON.parse(String(init.body)));
            return respostaDoPut();
        }
        return url.pathname === '/api/postos/1/tanques/painel' ? json(PAINEL) : json({}, 404);
    });
}

let raiz: Root;
let container: HTMLDivElement;

async function esperar(): Promise<void> {
    for (let i = 0; i < 12; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

/** Troca o valor como o usuário: o `onChange` do React escuta o evento nativo com o valor trocado. */
async function trocar(campo: HTMLInputElement | HTMLSelectElement, valor: string, evento: 'input' | 'change'): Promise<void> {
    const prototipo = campo instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
        Object.getOwnPropertyDescriptor(prototipo, 'value')?.set?.call(campo, valor);
        campo.dispatchEvent(new Event(evento, { bubbles: true }));
    });
}

async function clicar(texto: string): Promise<void> {
    const botao = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(texto));
    if (botao === undefined) throw new Error(`botão "${texto}" não está na tela`);
    await act(async () => {
        botao.click();
    });
    await esperar();
}

describe('Tanques (Combustível) no modo API — nenhuma chamada ao Supabase', () => {
    let corposDoPut: unknown[];
    let fetchFalso: ReturnType<typeof apiFalsa>;
    let alerta: ReturnType<typeof vi.fn>;

    function preparar(respostaDoPut: () => Response): void {
        corposDoPut = [];
        fetchFalso = apiFalsa(corposDoPut, respostaDoPut);
        vi.stubGlobal('fetch', fetchFalso);
    }

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-09-25T15:00:00Z'));
        toqueNoSupabase.mockClear();
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubEnv('VITE_API_LOGIN', '1');
        vi.stubEnv('VITE_API_TANQUES', '');
        alerta = vi.fn();
        vi.stubGlobal('alert', alerta);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        act(() => raiz.unmount());
        container.remove();
        vi.useRealTimers();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    async function montar(): Promise<void> {
        await act(async () => {
            raiz = createRoot(container);
            raiz.render(<TelaDashboardEstoque />);
        });
        await esperar();
    }

    async function medir(texto: string): Promise<void> {
        await clicar('Nova Medição (Régua)');
        await trocar(container.querySelector('select') as HTMLSelectElement, '10', 'change');
        await trocar(container.querySelector('input[placeholder="Ex: 15000"]') as HTMLInputElement, texto, 'input');
        await clicar('Confirmar Medição');
    }

    const rotas = (): string[] => fetchFalso.mock.calls.map(([e, init]) => `${init?.method ?? 'GET'} ${new URL(String(e)).pathname}`);

    it('lê a tela e grava a régua pela API, com os números da tela', async () => {
        preparar(() => json({ data: { tanque_id: 10, data: '2026-09-25', volume_fisico: '12345.68' } }));
        await montar();

        expect(rotas()).toEqual(['GET /api/postos/1/tanques/painel']);
        // 8000,50 + 1000 − 500,25 = 8500,25 L; valor bruto 8500,25 × 5,50 = R$ 46.751,38; despesa do
        // mês 1000,50 ÷ 500,25 L = 2,00/L → lucro previsto 8500,25 × (6,50 − 5,50 − 2,00) = −R$ 8.500,25
        const texto = (container.textContent ?? '').replace(/\u00a0/g, ' ');
        expect(texto).toContain('Tanque GC');
        expect(texto).toContain('8.500,25 L');
        expect(texto).toContain('Valor Bruto em EstoqueR$ 46.751,38');
        expect(texto).toContain('Lucro Previsto Estimado-R$ 8.500,25');
        expect(container.textContent).not.toContain('Tanque sem régua');

        await medir('12345,678');

        expect(corposDoPut).toEqual([{ tanque_id: 10, data: '2026-09-25', volume_fisico: '12345.678' }]);
        expect(rotas()).toEqual(['GET /api/postos/1/tanques/painel', 'PUT /api/postos/1/tanques/medicoes', 'GET /api/postos/1/tanques/painel']);
        expect(alerta).not.toHaveBeenCalled();
        expect(container.textContent).not.toContain('Confirmar Medição'); // o modal fechou
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });

    it('a recusa do servidor chega ao gerente e o modal fica aberto', async () => {
        preparar(() => json({ erro: { codigo: 'fora_da_janela', mensagem: 'O dia está fora da janela.' } }, 422));
        await montar();

        await medir('9000');

        expect(corposDoPut).toEqual([{ tanque_id: 10, data: '2026-09-25', volume_fisico: '9000' }]);
        expect(alerta).toHaveBeenCalledWith('Erro ao salvar medição: Gravação recusada (fora_da_janela): O dia está fora da janela.');
        expect(container.textContent).toContain('Confirmar Medição');
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });

    it('acima da capacidade: recusa na tela, nada vai à API', async () => {
        preparar(() => json({}, 500));
        await montar();

        await medir('15000,01');

        expect(corposDoPut).toEqual([]);
        expect(alerta).toHaveBeenCalledWith(`O valor não pode exceder a capacidade do tanque (${(15000).toLocaleString()} L)`);
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });
});
