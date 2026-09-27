import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Tela Produtos e Estoque (loja) 100% pela API — prova de ponta a ponta (#103, painel-pela-api.md §12).
 *
 * A TELA INTEIRA é montada no modo API (`VITE_API_URL` + `VITE_API_LOGIN=1`, que não cria sessão do
 * Supabase) e percorre listar, cadastrar, editar e movimentar (entrada e saída). Qualquer toque no client
 * do Supabase — `from`, `rpc`, `channel`, `auth`, o que for — reprova: o Proxy registra e lança. É o
 * desenho da prova da tela Frentistas (`gestao-de-equipe-pela-api.test.tsx`).
 */
const { toqueNoSupabase, modo } = vi.hoisted(() => ({ toqueNoSupabase: vi.fn(), modo: { lancar: true } }));
vi.mock('../../../services/supabase', () => {
    // Só no teste da flag desligada: um client que aceita qualquer cadeia e responde vazio.
    const cadeia: unknown = new Proxy(() => undefined, {
        get: (_alvo, chave) => (chave === 'then' ? (ok: (v: unknown) => void) => ok({ data: [], error: null }) : cadeia),
        apply: () => cadeia,
    });
    return {
        supabase: new Proxy(
            {},
            {
                get: (_alvo, chave) => {
                    toqueNoSupabase(String(chave));
                    if (modo.lancar) throw new Error(`Supabase tocado: ${String(chave)}`);
                    return cadeia;
                },
            },
        ),
    };
});

const { POSTO } = vi.hoisted(() => ({ POSTO: { postoAtivoId: 1, postoAtivo: { id: 1, nome: 'Posto Jorro' } } }));
vi.mock('../../../contexts/usePosto', () => ({ usePosto: () => POSTO }));

import TelaGestaoEstoque from './index.tsx';

/* ------------------------------------------------------------------ a API falsa ------------- */

interface Pedido {
    readonly metodo: string;
    readonly rota: string;
    readonly corpo: Record<string, unknown> | null;
}

const produto = (id: number, nome: string, custo: string, venda: string, estoque: number, minimo: number) => ({
    id, nome, codigo_barras: null, categoria: 'Lubrificante', descricao: null, preco_custo: custo, preco_venda: venda,
    estoque_atual: estoque, estoque_minimo: minimo, unidade_medida: 'unidade', ativo: true, posto_id: 1, created_at: '2026-09-01T12:00:00+00:00',
});

/*
 * Aditivo: 3 un a R$ 4,50 (mínimo 5 → baixo); Filtro: 0 un a R$ 12,35 (mínimo 0 → baixo);
 * Óleo 20W: 10 un a R$ 10,00. Valor em estoque = 3 × 4,50 + 0 × 12,35 + 10 × 10,00 = R$ 113,50.
 */
const LISTA = [
    produto(2, 'Aditivo', '4.50', '9.90', 3, 5),
    produto(3, 'Filtro', '12.35', '25.00', 0, 0),
    produto(1, 'Óleo 20W', '10.00', '19.90', 10, 5),
];

const json = (corpo: unknown, status = 200): Response => new Response(JSON.stringify(corpo), { status });

function apiFalsa(pedidos: Pedido[]) {
    return vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(entrada));
        const rota = url.pathname.replace('/api/postos/1', '');
        const metodo = init?.method ?? 'GET';
        const corpo = typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null;
        pedidos.push({ metodo, rota, corpo });

        if (metodo === 'GET' && rota === '/estoque/produtos') return json({ data: LISTA });
        if (metodo === 'POST' && rota === '/estoque/produtos') return json({ data: { repetido: false, produto: produto(9, 'Fluido', '12.35', '19.90', 7, 5) } }, 201);
        if (metodo === 'PUT' && rota === '/estoque/produtos/1') return json({ data: produto(1, 'Óleo 20W50', '10.00', '19.90', 10, 5) });
        if (metodo === 'POST' && rota === '/estoque/movimentacoes') {
            return json({ data: { repetido: false, movimentacao: { id: 70, produto_id: corpo?.['produto_id'], tipo: corpo?.['tipo'], quantidade: corpo?.['quantidade'] }, produto: LISTA[0] } }, 201);
        }
        return json({}, 404);
    });
}

/* ------------------------------------------------------------------ o harness --------------- */

let raiz: Root;
let container: HTMLDivElement;

async function esperar(): Promise<void> {
    for (let i = 0; i < 8; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

function elementoComTexto<T extends HTMLElement>(seletor: string, texto: string): T {
    const achado = [...container.querySelectorAll<T>(seletor)].find((e) => (e.textContent ?? '').includes(texto));
    if (achado === undefined) throw new Error(`"${texto}" não está na tela (${seletor})`);
    return achado;
}

async function clicar(el: HTMLElement): Promise<void> {
    await act(async () => {
        el.click();
    });
    await esperar();
}

/** Digita como o usuário: o setter nativo e o evento que o React escuta. */
async function digitar(nome: string, valor: string): Promise<void> {
    const campo = container.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[name="${nome}"]`);
    if (campo === null) throw new Error(`campo ${nome} não está na tela`);
    const prototipo = Object.getPrototypeOf(campo) as object;
    const setter = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set;
    await act(async () => {
        setter?.call(campo, valor);
        campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
    });
}

/** Os botões da linha do produto: [Movimentar Estoque, Editar]. */
function botoesDaLinha(nome: string): [HTMLButtonElement, HTMLButtonElement] {
    const linha = elementoComTexto<HTMLTableRowElement>('tr', nome);
    const [movimentar, editar] = [...linha.querySelectorAll<HTMLButtonElement>('button')];
    if (movimentar === undefined || editar === undefined) throw new Error(`linha ${nome} sem botões`);
    return [movimentar, editar];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('Tela Produtos e Estoque no modo API — nenhuma chamada ao Supabase', () => {
    let pedidos: Pedido[];
    let fetchFalso: ReturnType<typeof apiFalsa>;
    let alerta: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        toqueNoSupabase.mockClear();
        modo.lancar = true;
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubEnv('VITE_API_LOGIN', '1');
        pedidos = [];
        fetchFalso = apiFalsa(pedidos);
        vi.stubGlobal('fetch', fetchFalso);
        alerta = vi.fn();
        vi.stubGlobal('alert', alerta);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        act(() => raiz.unmount());
        container.remove();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    async function montar(): Promise<void> {
        await act(async () => {
            raiz = createRoot(container);
            raiz.render(<TelaGestaoEstoque />);
        });
        await esperar();
    }

    const escritas = (): Pedido[] => pedidos.filter((p) => p.metodo !== 'GET');

    it('lista com os números de antes, cadastra, edita e movimenta — tudo pela API', async () => {
        await montar();

        // Lista e cartões: 3 produtos, 2 com estoque baixo, R$ 113,50 a custo.
        expect(pedidos.map((p) => `${p.metodo} ${p.rota}`)).toEqual(['GET /estoque/produtos']);
        const cartoes = container.querySelectorAll('.grid > div');
        expect(cartoes[0]?.textContent).toContain('3');
        expect(cartoes[1]?.textContent).toContain('2');
        expect(cartoes[2]?.textContent).toMatch(/R\$\s113,50/);
        expect(container.textContent).toContain('Óleo 20W');

        // Novo Produto: os campos do formulário, preço como o texto do número, a chave da tentativa.
        await clicar(elementoComTexto('button', 'Novo Produto'));
        await digitar('nome', 'Fluido');
        await digitar('preco_custo', '12.5'); // `step="0.01"`: o navegador não deixa passar 3 casas
        await digitar('preco_venda', '19.9');
        await digitar('estoque_inicial', '7');
        await clicar(elementoComTexto('button', 'Salvar'));
        const [novo] = escritas();
        expect(novo).toMatchObject({ metodo: 'POST', rota: '/estoque/produtos' });
        const { chave: chaveDoProduto, ...corpoDoProduto } = novo?.corpo ?? {};
        expect(chaveDoProduto).toMatch(UUID);
        expect(corpoDoProduto).toEqual({
            nome: 'Fluido', codigo_barras: null, categoria: 'Lubrificante', preco_custo: '12.5', preco_venda: '19.9',
            estoque_minimo: 5, unidade_medida: 'unidade', descricao: null, estoque_inicial: 7,
        });
        expect(pedidos.at(-1)).toMatchObject({ metodo: 'GET', rota: '/estoque/produtos' });

        // Editar o Óleo: PUT no id dele, sem chave e sem estoque — o custo que já estava vai de volta.
        await clicar(botoesDaLinha('Óleo 20W')[1]);
        await digitar('nome', 'Óleo 20W50');
        await clicar(elementoComTexto('button', 'Salvar'));
        expect(escritas()[1]).toEqual({
            metodo: 'PUT', rota: '/estoque/produtos/1',
            corpo: { nome: 'Óleo 20W50', codigo_barras: null, categoria: 'Lubrificante', preco_custo: '10', preco_venda: '19.9', estoque_minimo: 5, unidade_medida: 'unidade', descricao: null },
        });

        // Entrada de 10 no Óleo a R$ 20: o custo unitário vai em string; a conta é do servidor.
        await clicar(botoesDaLinha('Óleo 20W')[0]);
        await digitar('quantidade', '10');
        await digitar('valor_unitario', '20');
        await digitar('observacao', 'NF 123');
        await clicar(elementoComTexto('button', 'Salvar'));
        const entrada = escritas()[2]?.corpo ?? {};
        expect(entrada).toEqual({ chave: expect.stringMatching(UUID), produto_id: 1, tipo: 'entrada', quantidade: 10, valor_unitario: '20', observacao: 'NF 123' });

        // Saída de 2 no Aditivo: sem custo unitário, e outra chave (outra abertura do modal).
        await clicar(botoesDaLinha('Aditivo')[0]);
        await digitar('tipo', 'saida');
        await digitar('quantidade', '2');
        await clicar(elementoComTexto('button', 'Salvar'));
        const saida = escritas()[3]?.corpo ?? {};
        expect(saida).toEqual({ chave: expect.stringMatching(UUID), produto_id: 2, tipo: 'saida', quantidade: 2, observacao: null });
        expect(new Set([chaveDoProduto, entrada['chave'], saida['chave']]).size).toBe(3);

        expect(alerta).not.toHaveBeenCalled();
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    }, 20000);

    it('falhou a rede depois de gravar: o "Salvar" de novo reusa a MESMA chave (o servidor não soma duas vezes)', async () => {
        let primeira = true;
        fetchFalso.mockImplementation(async (entrada: string | URL | Request, init?: RequestInit) => {
            if (init?.method === 'POST' && primeira) {
                primeira = false;
                pedidos.push({ metodo: 'POST', rota: 'perdido', corpo: JSON.parse(String(init.body)) as Record<string, unknown> });
                throw new TypeError('Failed to fetch');
            }
            return apiFalsa(pedidos)(entrada, init);
        });
        await montar();

        await clicar(botoesDaLinha('Óleo 20W')[0]);
        await digitar('quantidade', '3');
        await digitar('valor_unitario', '11');
        await clicar(elementoComTexto('button', 'Salvar'));
        expect(alerta).toHaveBeenCalledWith(expect.stringContaining('Erro ao registrar movimentação'));
        expect(container.textContent).toContain('Registrar Movimentação'); // o modal fica aberto
        await clicar(elementoComTexto('button', 'Salvar'));

        const [perdido, reenviado] = escritas();
        expect(reenviado?.corpo?.['chave']).toBe(perdido?.corpo?.['chave']);
        expect(container.textContent).not.toContain('Registrar Movimentação');
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });

    it('recusa do servidor mostra o motivo e mantém o formulário aberto', async () => {
        fetchFalso.mockImplementation(async (entrada: string | URL | Request, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return json({ erro: { codigo: 'custo_fora_da_coluna', mensagem: 'O custo médio resultante não cabe.' } }, 422);
            }
            return apiFalsa(pedidos)(entrada, init);
        });
        await montar();

        await clicar(botoesDaLinha('Óleo 20W')[0]);
        await digitar('quantidade', '3');
        await digitar('valor_unitario', '11');
        await clicar(elementoComTexto('button', 'Salvar'));

        expect(alerta).toHaveBeenCalledWith(expect.stringContaining('custo_fora_da_coluna'));
        expect(container.textContent).toContain('Registrar Movimentação');
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });

    it('valor fora do contrato (expoente) não sai do cliente', async () => {
        await montar();

        await clicar(elementoComTexto('button', 'Novo Produto'));
        await digitar('nome', 'Caro');
        await digitar('preco_custo', '1e21');
        await digitar('preco_venda', '1');
        await clicar(elementoComTexto('button', 'Salvar'));

        expect(escritas()).toEqual([]);
        expect(alerta).toHaveBeenCalledWith(expect.stringContaining('Erro ao salvar produto'));
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });

    it('com VITE_API_ESTOQUE=0 a tela fica no Supabase (o caminho de hoje), mesmo com a URL da API', async () => {
        vi.stubEnv('VITE_API_ESTOQUE', '0');
        modo.lancar = false;
        await montar();

        expect(toqueNoSupabase).toHaveBeenCalledWith('from');
        expect(fetchFalso).not.toHaveBeenCalled();
    });
});
