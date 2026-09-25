import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Registro de Compras 100% pela API — prova de ponta a ponta (#103, 25/09/2026).
 *
 * A TELA INTEIRA é montada no modo API (`VITE_API_URL` + `VITE_API_LOGIN=1`, que não cria sessão do
 * Supabase): lê fornecedores, vendas, compras, régua e despesa do mês, o gerente digita uma compra e
 * uma régua, e salva. Qualquer toque no client do Supabase — `from`, `rpc`, `auth`, o que for —
 * reprova o teste: o Proxy abaixo registra e lança (o desenho de `fechamento-de-caixa-pela-api`).
 */
const { toqueNoSupabase } = vi.hoisted(() => ({ toqueNoSupabase: vi.fn() }));
vi.mock('../../services/supabase', () => ({
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
vi.mock('../../contexts/usePosto', () => ({ usePosto: () => POSTO }));

import TelaRegistroCompras from './index.tsx';

/* ------------------------------------------------------------------ a API falsa ------------- */

const COMBUSTIVEIS = [
    { id: 2, nome: 'Etanol', codigo: 'ET', cor: null, ativo: true, preco_venda: '4.80', preco_custo: '0' },
    { id: 3, nome: 'Diesel', codigo: 'DS', cor: null, ativo: false, preco_venda: '6.00', preco_custo: '0' },
    { id: 1, nome: 'Gasolina Comum', codigo: 'GC', cor: null, ativo: true, preco_venda: '6.50', preco_custo: '0' },
];

const TANQUES = [
    { id: 10, nome: 'T1', combustivel_id: 1, capacidade: '15000.00', estoque_atual: '0.00', ativo: true },
    { id: 11, nome: 'T2', combustivel_id: 2, capacidade: '15000.00', estoque_atual: '0.00', ativo: true },
];

const leitura = (bico: number, combustivel: number, data: string, inicial: string, final: string, valor: string) => ({
    bico_id: bico, combustivel_id: combustivel, data, leitura_inicial: inicial, leitura_final: final,
    litros_vendidos: '0.000', preco_litro: '0.00', valor_total: valor,
});

const MOVIMENTO = {
    periodo: { inicio: '2026-09-01', fim: '2026-09-25' },
    leituras: [
        leitura(100, 1, '2026-09-01', '1000.000', '1500.000', '3250.00'),
        leitura(100, 1, '2026-09-02', '1500.000', '2000.000', '3250.00'),
        leitura(101, 2, '2026-09-01', '500.000', '700.000', '960.00'),
    ],
    compras: [{ combustivel_id: 1, data: '2026-09-05', quantidade_litros: '5000.00', valor_total: '29000.00' }],
    despesas: [],
    medicoes: [
        { tanque_id: 10, data: '2026-08-15', volume_fisico: '9000.00' },
        { tanque_id: 11, data: '2026-08-20', volume_fisico: '3000.50' },
        { tanque_id: 11, data: '2026-08-31', volume_fisico: null },   // régua não feita: não conta
        { tanque_id: 10, data: '2026-08-31', volume_fisico: '8000.00' }, // a última ANTES do mês
        { tanque_id: 10, data: '2026-09-10', volume_fisico: '7000.00' }, // dentro do mês: não é a anterior
    ],
};

const DASHBOARD = {
    periodo: { inicio: '2026-09-01', fim: '2026-09-30' },
    produtos: [],
    rateio: { mes_civil: { inicio: '2026-09-01', fim: '2026-09-30' }, despesas_total: '1234.56', litros_vendidos: '1200.000' },
    leituras: [],
};

const json = (corpo: unknown, status = 200): Response => new Response(JSON.stringify(corpo), { status });

function apiFalsa(corposDoPost: unknown[]) {
    return vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(entrada));
        const rota = url.pathname.replace('/api/postos/1', '');

        if (init?.method === 'POST' && rota === '/compras') {
            corposDoPost.push(JSON.parse(String(init.body)));
            return json({ data: { repetido: false, compras: [], medicoes: [] } }, 201);
        }

        const rotas: Record<string, () => Response> = {
            '/combustiveis': () => json({ data: COMBUSTIVEIS }),
            '/tanques': () => json({ data: TANQUES }),
            '/bicos': () => json({ data: [{ id: 100, numero: 1, ativo: true }, { id: 101, numero: 2, ativo: true }] }),
            '/movimento': () => json(MOVIMENTO),
            '/fornecedores': () => json({ data: [{ id: 7, nome: 'Distribuidora', cnpj: '00.000.000/0001-00', contato: null, ativo: true }] }),
            '/dashboard': () => json(DASHBOARD),
        };
        return (rotas[rota] ?? (() => json({}, 404)))();
    });
}

/* ------------------------------------------------------------------ o harness --------------- */

let raiz: Root;
let container: HTMLDivElement;

async function esperar(): Promise<void> {
    for (let i = 0; i < 12; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

/** Digita como o usuário: o `onChange` do React escuta o evento `input` com o valor nativo trocado. */
async function digitar(campo: HTMLInputElement, texto: string): Promise<void> {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
        setter?.call(campo, texto);
        campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

function botaoComTexto(texto: string): HTMLButtonElement {
    const botao = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(texto));
    if (botao === undefined) throw new Error(`botão "${texto}" não está na tela`);
    return botao;
}

describe('Registro de Compras no modo API — nenhuma chamada ao Supabase', () => {
    let corposDoPost: unknown[];
    let fetchFalso: ReturnType<typeof apiFalsa>;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-09-25T15:00:00Z'));
        localStorage.clear();
        sessionStorage.clear();
        toqueNoSupabase.mockClear();
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubEnv('VITE_API_LOGIN', '1');
        vi.stubEnv('VITE_API_FORNECEDOR', '');
        corposDoPost = [];
        fetchFalso = apiFalsa(corposDoPost);
        vi.stubGlobal('fetch', fetchFalso);
        vi.stubGlobal('alert', vi.fn());
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
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
            raiz.render(
                <MemoryRouter>
                    <TelaRegistroCompras />
                </MemoryRouter>,
            );
        });
        await esperar();
    }

    const rotasChamadas = (): string[] =>
        fetchFalso.mock.calls.map(([entrada, init]) => `${init?.method ?? 'GET'} ${new URL(String(entrada)).pathname}`);

    it('lê o mês, grava uma compra e a régua — tudo pela API, com os números da tela', async () => {
        await montar();

        expect(rotasChamadas()).toEqual(expect.arrayContaining([
            'GET /api/postos/1/combustiveis', 'GET /api/postos/1/tanques', 'GET /api/postos/1/bicos',
            'GET /api/postos/1/movimento', 'GET /api/postos/1/fornecedores', 'GET /api/postos/1/dashboard',
        ]));
        const movimento = fetchFalso.mock.calls.map(([e]) => new URL(String(e))).find((u) => u.pathname.endsWith('/movimento'));
        expect(movimento?.searchParams.get('inicio')).toBe('2026-09-01');
        expect(movimento?.searchParams.get('fim')).toBe('2026-09-25');   // o mês corrente recorta em hoje

        // A despesa do mês (do /dashboard) e o fornecedor estão na tela; o Diesel inativo, não.
        expect(container.textContent).toContain('1.234,56');
        expect(container.textContent).toContain('Distribuidora');
        expect(container.textContent).not.toContain('Diesel');

        // Ordem da tela: GC antes de ET. Compra de 1.000 L de GC por R$ 5.850,50 e régua de GC.
        const litros = [...container.querySelectorAll<HTMLInputElement>('input[placeholder="0,000"]')];
        const reais = [...container.querySelectorAll<HTMLInputElement>('input[placeholder="0,00"]')];
        expect(litros).toHaveLength(4); // compra GC, compra ET, régua GC, régua ET
        await digitar(litros[0] as HTMLInputElement, '1000');
        await digitar(reais[0] as HTMLInputElement, '5850,50');
        await digitar(litros[2] as HTMLInputElement, '12990');

        fetchFalso.mockClear();
        await act(async () => {
            botaoComTexto('FINALIZAR COMPRA').click();
        });
        await esperar();

        expect(corposDoPost).toHaveLength(1);
        expect(corposDoPost[0]).toEqual({
            chave: expect.stringMatching(/^[0-9a-f-]{36}$/),
            data: '2026-09-25',
            fornecedor_id: 7,
            itens: [
                {
                    combustivel_id: 1, tanque_id: 10,
                    compra: { quantidade_litros: '1000.000', valor_total: '5850.50' },
                    // anterior 8.000 + compras 5.000 + 1.000 − vendidos 1.000 (salto do B1)
                    volume_livro: '13000',
                    volume_fisico: '12990',
                },
                {
                    combustivel_id: 2, tanque_id: 11, compra: null,
                    // anterior 3.000,50 − vendidos 200
                    volume_livro: '2800.5',
                    volume_fisico: null,
                },
            ],
        });
        // Depois de gravar, a tela relê o mês — pela API.
        expect(rotasChamadas()).toEqual(expect.arrayContaining(['POST /api/postos/1/compras', 'GET /api/postos/1/movimento']));
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });

    it('a mesma tentativa clicada de novo (a rede caiu) reusa a chave — o servidor devolve o já gravado em vez de somar de novo', async () => {
        await montar();
        const litros = [...container.querySelectorAll<HTMLInputElement>('input[placeholder="0,000"]')];
        await digitar(litros[0] as HTMLInputElement, '1000');

        // A primeira tentativa cai (rede), a segunda com os MESMOS números leva a MESMA chave.
        fetchFalso.mockImplementationOnce(async () => {
            throw new TypeError('rede caiu');
        });
        await act(async () => {
            botaoComTexto('FINALIZAR COMPRA').click();
        });
        await esperar();
        await act(async () => {
            botaoComTexto('FINALIZAR COMPRA').click();
        });
        await esperar();

        const posts = fetchFalso.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => JSON.parse(String(init?.body)) as { chave: string });
        expect(posts).toHaveLength(2);
        expect(posts[1]?.chave).toBe(posts[0]?.chave);
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });
});
