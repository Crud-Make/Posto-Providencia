import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/*
 * Fechamento de Caixa 100% pela API — prova de ponta a ponta (25/09/2026).
 *
 * A TELA INTEIRA é montada no modo API (`VITE_API_URL` + `VITE_API_LOGIN=1`, que não cria sessão do
 * Supabase) e percorre as cinco abas, remove um envio e salva o dia. Qualquer toque no client do
 * Supabase — `from`, `rpc`, `channel`, `auth`, o que for — reprova o teste: o Proxy abaixo registra e
 * lança. É o mesmo desenho da prova da Visão do Proprietário (`fonte-da-api.test.ts`).
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

// Objetos ESTÁVEIS entre renders, como os contextos reais: um objeto novo a cada chamada troca a
// identidade dos `useCallback` que dependem dele e põe a aba Fechamento Mensal em laço de recarga.
const { POSTO, PERIODO } = vi.hoisted(() => ({
    POSTO: { postoAtivoId: 1, postoAtivo: { id: 1, nome: 'Posto Jorro' } },
    PERIODO: { mes: '2026-09', definirMes: (): void => undefined },
}));
vi.mock('../../contexts/usePosto', () => ({ usePosto: () => POSTO }));
vi.mock('../../contexts/usePeriodo', () => ({ usePeriodo: () => PERIODO }));

import TelaFechamentoDiario from './index.tsx';

/* ------------------------------------------------------------------ a API falsa ------------- */

const BICOS = [7, 8].map((id) => ({
    id,
    numero: id - 6,
    ativo: true,
    bomba: { id: 1, nome: 'Bomba 1', localizacao: null, ativo: true },
    combustivel: { id: 1, nome: 'Gasolina Comum', codigo: 'GC', cor: null, ativo: true, preco_venda: '6.00', preco_custo: '5.00' },
    tanque: null,
}));

const FRENTISTAS = [
    { id: 1, nome: 'Ana', telefone: null, data_admissao: '2026-01-01T00:00:00Z', ativo: true, turno_id: null },
    { id: 2, nome: 'Beto', telefone: null, data_admissao: '2026-01-01T00:00:00Z', ativo: true, turno_id: null },
];

function sessao(id: number, frentistaId: number, dinheiro: string, pix: string) {
    return {
        id, fechamento_id: 50, frentista_id: frentistaId,
        valor_dinheiro: dinheiro, valor_cartao: '0.00', valor_cartao_debito: null, valor_cartao_credito: null,
        valor_pix: pix, valor_nota: '0.00', valor_moedas: '0.00', baratao: null, baratencia: null,
        valor_conferido: '0.00', encerrante: null, diferenca_calculada: null, observacoes: null,
        data_hora_envio: '2026-09-20T14:00:00Z',
    };
}

function leituraDoDia(id: number, bicoId: number, dia: string) {
    return {
        id, data: `${dia}T00:00:00Z`, bico_id: bicoId, combustivel_id: 1, turno_id: null,
        leitura_inicial: '1000.000', leitura_final: '1100.000', litros_vendidos: '100.000', preco_litro: '6.00', valor_total: '600.00',
    };
}

const json = (corpo: unknown, status = 200): Response => new Response(JSON.stringify(corpo), { status });

/** Responde pelo CAMINHO (a data da tela é a de hoje) e guarda o corpo do PUT. */
function apiFalsa(corposDoPut: unknown[]) {
    return vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
        const url = new URL(String(entrada));
        const dia = url.searchParams.get('data') ?? '2026-09-20';
        const rota = url.pathname.replace('/api/postos/1', '');

        if (init?.method === 'PUT' && rota === '/fechamento') {
            corposDoPut.push(JSON.parse(String(init.body)));
            return json({ data: {
                id: 50, data: `${dia}T00:00:00Z`, total_vendas: '1200.00', total_recebido: '500.00', diferenca: '700.00',
                status: 'FECHADO', observacoes: '', usuario_id: 3, turno_id: null, recebimentos: [],
            } });
        }

        const rotas: Record<string, () => Response> = {
            '/bicos': () => json({ data: BICOS }),
            '/frentistas': () => json({ data: FRENTISTAS }),
            '/formas-pagamento': () => json({ data: [{ id: 1, nome: 'Dinheiro', tipo: 'DINHEIRO', ativo: true, taxa: '0.00' }] }),
            '/combustiveis': () => json({ data: [{ id: 1, nome: 'Gasolina Comum', codigo: 'GC' }] }),
            '/leituras': () => json({ data: url.searchParams.has('ate') ? [] : [leituraDoDia(301, 7, dia), leituraDoDia(302, 8, dia)] }),
            '/leituras/ultimas': () => json({ data: [] }),
            '/sessoes': () => json({ data: [sessao(101, 1, '500.00', '0.00'), sessao(102, 2, '0.00', '300.00')] }),
            '/fechamento': () => json({ data: null }),
            '/fechamento-mensal/2026/9': () => json({ periodo: { inicio: '2026-09-01', fim: '2026-09-30' }, dias: [] }),
        };
        // `/dashboard` (custo do mês) fica sem rota de propósito: 404 → custo indisponível, "—" na tela.
        return (rotas[rota] ?? (() => json({}, 404)))();
    });
}

/* ------------------------------------------------------------------ o harness --------------- */

let raiz: Root;
let container: HTMLDivElement;

async function esperar(): Promise<void> {
    // Várias ondas de efeito → fetch → setState. Poucos ciclos bastam; cada um é uma volta do loop.
    for (let i = 0; i < 12; i++) {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
    }
}

function botaoComTexto(texto: string): HTMLButtonElement {
    const botao = [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(texto));
    if (botao === undefined) throw new Error(`botão "${texto}" não está na tela`);
    return botao;
}

async function clicar(botao: HTMLElement): Promise<void> {
    await act(async () => {
        botao.click();
    });
    await esperar();
}

describe('Fechamento de Caixa no modo API — nenhuma chamada ao Supabase', () => {
    let corposDoPut: unknown[];
    let fetchFalso: ReturnType<typeof apiFalsa>;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        toqueNoSupabase.mockClear();
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubEnv('VITE_API_LOGIN', '1');
        corposDoPut = [];
        fetchFalso = apiFalsa(corposDoPut);
        vi.stubGlobal('fetch', fetchFalso);
        vi.stubGlobal('confirm', () => true);
        vi.spyOn(console, 'log').mockImplementation(() => undefined);
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
            raiz.render(
                <MemoryRouter>
                    <TelaFechamentoDiario />
                </MemoryRouter>,
            );
        });
        await esperar();
    }

    const rotasChamadas = (): string[] =>
        fetchFalso.mock.calls.map(([entrada, init]) => `${init?.method ?? 'GET'} ${new URL(String(entrada)).pathname}`);

    it('abre o dia, percorre as cinco abas, remove um envio e salva — tudo pela API', async () => {
        await montar();

        // O dia inteiro veio da API: cadastro, leituras, envios e recebimentos.
        expect(rotasChamadas()).toEqual(expect.arrayContaining([
            'GET /api/postos/1/bicos', 'GET /api/postos/1/frentistas', 'GET /api/postos/1/formas-pagamento',
            'GET /api/postos/1/leituras', 'GET /api/postos/1/sessoes', 'GET /api/postos/1/fechamento',
        ]));
        expect(container.textContent).toContain('Beto');
        // Tempo real desligado de forma EXPLÍCITA, com o botão de recarregar no lugar.
        expect(container.textContent).toContain('Atualização automática desligada');

        // Recarregar vai à API, não ao canal.
        fetchFalso.mockClear();
        await clicar(botaoComTexto('Recarregar do servidor'));
        expect(rotasChamadas()).toEqual(expect.arrayContaining(['GET /api/postos/1/leituras', 'GET /api/postos/1/sessoes', 'GET /api/postos/1/fechamento']));

        // As outras quatro abas.
        await clicar(botaoComTexto('Detalhamento Frentistas'));
        fetchFalso.mockClear();
        await clicar(botaoComTexto('Mês ·'));
        // O resumo mensal por frentista: as sessões do MÊS (`ate`) e os nomes do catálogo.
        const consultas = fetchFalso.mock.calls.map(([entrada]) => new URL(String(entrada)));
        expect(consultas.some((u) => u.pathname === '/api/postos/1/sessoes' && u.searchParams.has('ate'))).toBe(true);
        expect(consultas.some((u) => u.pathname === '/api/postos/1/frentistas')).toBe(true);
        expect(container.textContent).toContain('Ana');
        await clicar(botaoComTexto('Gestão de Bicos'));
        await clicar(botaoComTexto('Receitas e Despesas'));
        expect(container.textContent).toContain('Receitas e Despesas ainda não funciona pela API');
        await clicar(botaoComTexto('Fechamento Mensal'));
        expect(rotasChamadas()).toContain('GET /api/postos/1/fechamento-mensal/2026/9');

        // De volta às leituras: remove o envio do Beto e salva.
        await clicar(botaoComTexto('Leituras de Bomba'));
        const lixeiras = [...container.querySelectorAll<HTMLButtonElement>('button[title="Excluir Envio"]')];
        expect(lixeiras).toHaveLength(2);
        await clicar(lixeiras[1] as HTMLButtonElement);
        expect(rotasChamadas().filter((r) => r.startsWith('DELETE'))).toEqual([]); // nada apagado na hora

        await clicar(botaoComTexto('Salvar Fechamento'));

        expect(corposDoPut).toHaveLength(1);
        expect(corposDoPut[0]).toMatchObject({
            sessoes: [expect.objectContaining({ frentista_id: 1, valor_dinheiro: '500.00' })],
            // O Beto foi tirado da tela: conhecido e não enviado → o servidor o apaga (§7 (c)).
            frentistas_conhecidos: [1, 2],
            leituras: [expect.objectContaining({ bico_id: 7 }), expect.objectContaining({ bico_id: 8 })],
        });

        expect(toqueNoSupabase).not.toHaveBeenCalled();
    }, 20000);
});
