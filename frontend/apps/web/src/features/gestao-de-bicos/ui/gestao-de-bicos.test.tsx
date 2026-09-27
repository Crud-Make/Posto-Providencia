import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { errAsync, okAsync } from 'neverthrow';
import type { PistaDaApi } from '../api/cadastro-de-bicos.api';

const api = vi.hoisted(() => ({
    lerPistaDaApi: vi.fn(),
    gravarBicoNaApi: vi.fn(),
    gravarBombaNaApi: vi.fn(),
    gravarCombustivelNaApi: vi.fn(),
    gravarTanqueNaApi: vi.fn(),
}));
vi.mock('../api/cadastro-de-bicos.api', () => api);

const { PistaDoPosto } = await import('./pista-do-posto');

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const pista: PistaDaApi = {
    bombas: [
        { id: 2, nome: 'BOMBA 02', localizacao: null, ativo: true },
        { id: 1, nome: 'BOMBA 01', localizacao: 'Ilha da frente', ativo: true },
    ],
    bicos: [
        { id: 11, numero: 2, ativo: true, bomba: { id: 1 }, combustivel: { id: 5 }, tanque: { id: 50 } },
        { id: 10, numero: 1, ativo: true, bomba: { id: 1 }, combustivel: { id: 6 }, tanque: { id: 60 } },
    ],
    combustiveis: [
        { id: 5, nome: 'Gasolina Comum', codigo: 'GC', cor: '#E53935', ativo: true, preco_venda: '6.89' },
        { id: 6, nome: 'Etanol', codigo: 'ET', cor: '#43A047', ativo: true, preco_venda: '4.89' },
    ],
    tanques: [
        { id: 50, nome: 'Tanque GC', combustivel_id: 5, capacidade: '20000.00', ativo: true },
        { id: 60, nome: 'Tanque ET', combustivel_id: 6, capacidade: '15000.00', ativo: true },
    ],
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
    vi.clearAllMocks();
    api.lerPistaDaApi.mockImplementation(() => okAsync(pista));
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
});

afterEach(() => {
    act(() => root.unmount());
    container.remove();
});

async function monta(): Promise<void> {
    await act(async () => { root.render(<PistaDoPosto postoId={7} />); });
}

function botao(texto: string): HTMLButtonElement {
    const achado = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(texto) === true || b.getAttribute('aria-label') === texto);
    if (achado === undefined) throw new Error(`botão ${texto} não achado`);
    return achado;
}

/** Troca o valor como o usuário faria: o setter nativo e o evento que o React ouve. */
function preenche(campo: HTMLInputElement | HTMLSelectElement, valor: string): void {
    const prototipo = campo instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototipo, 'value')?.set?.call(campo, valor);
    campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

describe('PistaDoPosto — bombas e bicos', () => {
    it('mostra a pista do posto da rota agrupada por bomba, bicos em ordem de número', async () => {
        await monta();

        expect(api.lerPistaDaApi).toHaveBeenCalledWith(7);
        const bombas = [...container.querySelectorAll('h4')].map((h) => h.textContent).filter((t) => t?.startsWith('BOMBA') === true);
        expect(bombas).toEqual(['BOMBA 01', 'BOMBA 02']);
        const primeira = [...container.querySelectorAll('section')].find((sec) => sec.querySelector('h4')?.textContent === 'BOMBA 01');
        expect(primeira?.textContent).toMatch(/1.*Etanol.*Tanque ET.*2.*Gasolina Comum.*Tanque GC/);
        expect(container.textContent).toContain('2 bicos ativos em 2 bombas');
    });

    it('novo bico: sugere o próximo número, escolhe o tanque único do combustível e manda o corpo certo', async () => {
        api.gravarBicoNaApi.mockImplementation(() => okAsync({ id: 99, numero: 3, ativo: true, bomba: { id: 2 }, combustivel: { id: 5 }, tanque: { id: 50 } }));
        await monta();
        await act(async () => { botao('BICO').click(); });

        const [numero] = document.querySelectorAll<HTMLInputElement>('[role="dialog"] input');
        const [bomba, combustivel, tanque] = document.querySelectorAll<HTMLSelectElement>('[role="dialog"] select');
        expect(numero?.value).toBe('3');
        await act(async () => {
            preenche(bomba!, '2');
            preenche(combustivel!, '5');
        });
        expect(tanque?.value).toBe('50');
        await act(async () => { botao('Salvar').click(); });

        expect(api.gravarBicoNaApi).toHaveBeenCalledWith(7, null, { numero: 3, bomba_id: 2, combustivel_id: 5, tanque_id: 50, ativo: true });
        expect(api.lerPistaDaApi).toHaveBeenCalledTimes(2);
        expect(document.querySelector('[role="dialog"]')).toBeNull();
    });

    it('recusa do servidor aparece no formulário, que continua aberto', async () => {
        api.gravarBicoNaApi.mockImplementation(() => errAsync({
            tipo: 'recusado', status: 422, codigo: 'combustivel_travado',
            mensagem: 'Este bico já tem leitura lançada e não pode trocar de combustível: desative-o e cadastre outro.',
        }));
        await monta();
        await act(async () => { botao('Editar bico 1').click(); });
        const [, combustivel] = document.querySelectorAll<HTMLSelectElement>('[role="dialog"] select');
        await act(async () => { preenche(combustivel!, '5'); });
        await act(async () => { botao('Salvar').click(); });

        expect(api.gravarBicoNaApi).toHaveBeenCalledWith(7, 10, { numero: 1, bomba_id: 1, combustivel_id: 5, tanque_id: 50, ativo: true });
        expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain('não pode trocar de combustível');
        expect(api.lerPistaDaApi).toHaveBeenCalledTimes(1);
    });

    it('formulário incompleto não chama a API', async () => {
        await monta();
        await act(async () => { botao('BICO').click(); });
        await act(async () => { botao('Salvar').click(); });

        expect(api.gravarBicoNaApi).not.toHaveBeenCalled();
        expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toBe('Escolha a bomba.');
    });
});

describe('PistaDoPosto — combustíveis e tanques (#157)', () => {
    it('mostra cada combustível com o preço e os tanques dele', async () => {
        await monta();
        const gc = [...container.querySelectorAll('section')].find((sec) => sec.querySelector('h4')?.textContent === 'Gasolina Comum');
        expect(gc?.textContent).toContain('R$ 6,89');
        expect(gc?.textContent).toContain('Tanque GC');
        expect(gc?.textContent).toContain('20.000 L');
    });

    it('editar o preço: "6,99" digitado vai para a API como "6.99" (string, sem float) e a pista recarrega', async () => {
        api.gravarCombustivelNaApi.mockImplementation(() => okAsync({ id: 5, nome: 'Gasolina Comum', codigo: 'GC', cor: '#E53935', ativo: true, preco_venda: '6.99' }));
        await monta();
        await act(async () => { botao('Editar Gasolina Comum').click(); });
        const campos = document.querySelectorAll<HTMLInputElement>('[role="dialog"] input');
        const preco = [...campos].find((c) => c.placeholder === '6,89');
        expect(preco?.value).toBe('6,89');
        await act(async () => { preenche(preco!, '6,99'); });
        await act(async () => { botao('Salvar').click(); });

        expect(api.gravarCombustivelNaApi).toHaveBeenCalledWith(7, 5, { nome: 'Gasolina Comum', codigo: 'GC', cor: '#E53935', preco_venda: '6.99', ativo: true });
        expect(api.lerPistaDaApi).toHaveBeenCalledTimes(2);
    });

    it('"+ tanque de Etanol" já abre com o Etanol escolhido e nunca manda estoque', async () => {
        api.gravarTanqueNaApi.mockImplementation(() => okAsync({ id: 61, nome: 'Tanque ET 2', combustivel_id: 6, capacidade: '10000.00', ativo: true }));
        await monta();
        await act(async () => { botao('+ tanque de Etanol').click(); });
        const [nome, capacidade] = document.querySelectorAll<HTMLInputElement>('[role="dialog"] input');
        expect(document.querySelector<HTMLSelectElement>('[role="dialog"] select')?.value).toBe('6');
        await act(async () => {
            preenche(nome!, 'Tanque ET 2');
            preenche(capacidade!, '10.000');
        });
        await act(async () => { botao('Salvar').click(); });

        expect(api.gravarTanqueNaApi).toHaveBeenCalledWith(7, null, { nome: 'Tanque ET 2', combustivel_id: 6, capacidade: '10000', ativo: true });
    });
});
