import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Tela Frentistas 100% pela API — prova de ponta a ponta (#103, painel-pela-api.md §10).
 *
 * A TELA INTEIRA é montada no modo API (`VITE_API_URL` + `VITE_API_LOGIN=1`, que não cria sessão do
 * Supabase) e percorre listar, abrir o histórico, cadastrar, editar e desativar. Qualquer toque no
 * client do Supabase — `from`, `rpc`, `channel`, `auth`, o que for — reprova: o Proxy registra e lança.
 * É o desenho da prova do Fechamento de Caixa (`fechamento-de-caixa-pela-api.test.tsx`).
 */
const { toqueNoSupabase, modo } = vi.hoisted(() => ({ toqueNoSupabase: vi.fn(), modo: { lancar: true } }));
vi.mock('../../services/supabase', () => {
    // Só no teste da flag desligada: um client que aceita qualquer cadeia e responde vazio, para a
    // tela seguir o caminho de hoje sem quebrar. Nos outros, qualquer toque lança.
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
vi.mock('../../contexts/usePosto', () => ({ usePosto: () => POSTO }));

import TelaGestaoFrentistas from './index.tsx';

/* ------------------------------------------------------------------ a API falsa ------------- */

interface Pedido {
    readonly metodo: string;
    readonly rota: string;
    readonly corpo: unknown;
}

const frentista = (id: number, nome: string, ativo = true) => ({ id, nome, data_admissao: '2025-03-10T00:00:00Z', ativo, foto: null });

const json = (corpo: unknown, status = 200): Response => new Response(JSON.stringify(corpo), { status });

function apiFalsa(pedidos: Pedido[]) {
    const equipe = [frentista(1, 'Ana'), frentista(2, 'Beto'), frentista(3, 'Caio', false)];

    return vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(entrada));
        const rota = url.pathname.replace('/api/postos/1', '');
        const metodo = init?.method ?? 'GET';
        const corpo: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
        pedidos.push({ metodo, rota, corpo });

        if (metodo === 'POST' && rota === '/equipe') return json({ data: frentista(9, 'Davi') }, 201);
        if (metodo === 'PUT' && rota === '/equipe/1') return json({ data: frentista(1, 'Ana Maria') });
        if (metodo === 'POST' && rota === '/equipe/2/desativar') return json({ data: frentista(2, 'Beto', false) });

        const rotas: Record<string, () => Response> = {
            '/equipe': () => json({ data: equipe }),
            '/turnos': () => json({ data: [{ id: 1, nome: 'Manhã', horario_inicio: '06:00:00', horario_fim: '14:00:00', ativo: true }] }),
            '/equipe/1/historico': () => json({ data: [
                { id: 70, diferenca_calculada: '10.00', fechamento: { data: '2026-09-20', turno_id: 1 } },
                { id: 69, diferenca_calculada: null, fechamento: { data: '2026-09-19', turno_id: null } },
            ] }),
        };
        return (rotas[rota] ?? (() => json({}, 404)))();
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

/** Digita como o usuário: o setter nativo e o evento `input`, que é o que o React escuta. */
async function digitar(nome: string, valor: string): Promise<void> {
    const campo = container.querySelector<HTMLInputElement>(`input[name="${nome}"]`);
    if (campo === null) throw new Error(`campo ${nome} não está na tela`);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
        setter?.call(campo, valor);
        campo.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

describe('Tela Frentistas no modo API — nenhuma chamada ao Supabase', () => {
    let pedidos: Pedido[];
    let fetchFalso: ReturnType<typeof apiFalsa>;

    beforeEach(() => {
        toqueNoSupabase.mockClear();
        modo.lancar = true;
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubEnv('VITE_API_LOGIN', '1');
        pedidos = [];
        fetchFalso = apiFalsa(pedidos);
        vi.stubGlobal('fetch', fetchFalso);
        vi.stubGlobal('confirm', () => true);
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
            raiz.render(<TelaGestaoFrentistas />);
        });
        await esperar();
    }

    const escritas = (): Pedido[] => pedidos.filter((p) => p.metodo !== 'GET');

    it('lista, abre o histórico, cadastra, edita e desativa — tudo pela API', async () => {
        await montar();

        // Lista: ativos por padrão; o inativo aparece no filtro "Inativo".
        expect(pedidos.map((p) => `${p.metodo} ${p.rota}`)).toContain('GET /equipe');
        expect(container.textContent).toContain('Ana');
        expect(container.textContent).not.toContain('Caio');
        await clicar(elementoComTexto('button', 'Inativo'));
        expect(container.textContent).toContain('Caio');
        await clicar(elementoComTexto('button', 'Ativo'));

        // Detalhe + histórico: a diferença gravada, o turno pelo catálogo, nula = OK.
        await clicar(elementoComTexto('h3', 'Ana'));
        expect(pedidos.map((p) => p.rota)).toEqual(expect.arrayContaining(['/equipe/1/historico', '/turnos']));
        expect(container.textContent).toContain('Divergente');
        expect(container.textContent).toContain('Manhã');
        expect(container.textContent).toContain('OK');

        // Cadastrar: o corpo são os três campos do formulário, sem posto (o posto é a rota).
        await clicar(elementoComTexto('button', 'Novo Colaborador'));
        await digitar('nome', 'Davi');
        await digitar('data_admissao', '2026-09-01');
        await clicar(elementoComTexto('button', 'Salvar'));
        expect(escritas()).toEqual([{ metodo: 'POST', rota: '/equipe', corpo: { nome: 'Davi', data_admissao: '2026-09-01', ativo: true } }]);

        // Editar a Ana: PUT no id dela, com a admissão que já estava (o dia, sem hora).
        await clicar(elementoComTexto('h3', 'Ana'));
        await clicar(container.querySelector<HTMLButtonElement>('button[title="Editar frentista"]') ?? container);
        await digitar('nome', 'Ana Maria');
        await clicar(elementoComTexto('button', 'Salvar'));
        expect(escritas()[1]).toEqual({ metodo: 'PUT', rota: '/equipe/1', corpo: { nome: 'Ana Maria', data_admissao: '2025-03-10', ativo: true } });

        // "Excluir" o Beto: desativa pela API, e a lista é relida.
        await clicar(elementoComTexto('h3', 'Beto'));
        pedidos.length = 0;
        await clicar(container.querySelector<HTMLButtonElement>('button[title="Excluir frentista"]') ?? container);
        expect(pedidos.map((p) => `${p.metodo} ${p.rota}`)).toEqual(['POST /equipe/2/desativar', 'GET /equipe']);

        expect(toqueNoSupabase).not.toHaveBeenCalled();
    }, 20000);

    it('recusa do servidor mantém o formulário aberto e mostra o motivo', async () => {
        fetchFalso.mockImplementation(async (entrada: string | URL | Request, init?: RequestInit) => {
            if (init?.method === 'POST') {
                return json({ erro: { codigo: 'corpo_invalido', mensagem: 'Corpo fora do contrato.', campos: {} } }, 422);
            }
            return new URL(String(entrada)).pathname.endsWith('/equipe') ? json({ data: [] }) : json({}, 404);
        });
        const alerta = vi.fn();
        vi.stubGlobal('alert', alerta);
        await montar();

        await clicar(elementoComTexto('button', 'Novo Colaborador'));
        await digitar('nome', 'Davi');
        await clicar(elementoComTexto('button', 'Salvar'));

        expect(alerta).toHaveBeenCalledWith(expect.stringContaining('corpo_invalido'));
        expect(container.textContent).toContain('Novo Frentista');
        expect(toqueNoSupabase).not.toHaveBeenCalled();
    });

    it('com VITE_API_FRENTISTAS=0 a tela fica no Supabase (o caminho de hoje), mesmo com a URL da API', async () => {
        vi.stubEnv('VITE_API_FRENTISTAS', '0');
        modo.lancar = false;
        await montar();

        expect(toqueNoSupabase).toHaveBeenCalledWith('from');
        expect(toqueNoSupabase).toHaveBeenCalledWith('channel'); // o tempo real de hoje, intacto
        expect(fetchFalso).not.toHaveBeenCalled();
    });
});
