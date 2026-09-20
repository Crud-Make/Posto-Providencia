import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Sinaliza ao React 19 que este ambiente suporta `act(...)` (o que o
// @testing-library faria por nós, se estivesse instalado).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Mocks mutáveis: cada teste ajusta o que o "banco" devolve.
const mocks = vi.hoisted(() => ({
    getEnviosDoDia: vi.fn(async (): Promise<unknown[]> => []),
    getOrCreateFechamento: vi.fn(async () => 1),
    submitFrentistaClosing: vi.fn(async () => ({})),
    // Chamadas que as telas secundárias fazem ao montar (Histórico e Vendas).
    getHistoricoFrentista: vi.fn(async (): Promise<unknown[]> => []),
    getProdutos: vi.fn(async (): Promise<unknown[]> => []),
}));

vi.mock('./services/api', () => ({
    api: {
        getFrentistas: async () => [{ id: 1, nome: 'Fulano' }],
        getEnviosDoDia: mocks.getEnviosDoDia,
        getOrCreateFechamento: mocks.getOrCreateFechamento,
        submitFrentistaClosing: mocks.submitFrentistaClosing,
        marcarPresenca: async () => undefined,
        // Telas secundárias: sem estes mocks, montar Tanques/Histórico/Vendas
        // dá TypeError dentro do useEffect (função inexistente no objeto).
        getTanques: async () => [],
        getMedicoesDoDia: async () => [],
        getHistoricoFrentista: mocks.getHistoricoFrentista,
        getProdutos: mocks.getProdutos,
        getVendasProdutoHoje: async () => [],
    },
}));

const App = (await import('./App')).default;
const { hojeIso, paraIsoLocal } = await import('@posto/utils');

const ontemIso = () => { const d = new Date(); d.setDate(d.getDate() - 1); return paraIsoLocal(d); };
const ptBr = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');

/** Dispara input num campo controlado pelo React (o setter nativo evita o valor "preso"). */
const digitar = (input: HTMLInputElement, valor: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, valor);
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

const botaoEnviar = () =>
    Array.from(container.querySelectorAll('button')).find((b) => /Enviar Registro|Toque de novo/.test(b.textContent ?? ''))!;

const clicar = async (el: Element) => {
    await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
};

let container: HTMLDivElement;
let root: Root;

const montar = async () => {
    await act(async () => {
        root.render(React.createElement(App));
    });
};

describe('PWA do frentista — abas', () => {
    beforeEach(() => {
        localStorage.clear();
        mocks.getEnviosDoDia.mockReset().mockResolvedValue([]);
        mocks.getOrCreateFechamento.mockReset().mockResolvedValue(1);
        mocks.submitFrentistaClosing.mockReset().mockResolvedValue({});
        mocks.getHistoricoFrentista.mockReset().mockResolvedValue([]);
        mocks.getProdutos.mockReset().mockResolvedValue([]);
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        localStorage.clear();
    });

    it('mantém as abas de frentista exigindo frentista', async () => {
        localStorage.setItem('pwa.activeTab', 'vendas');

        await montar();

        expect(container.textContent).toContain('Selecione um frentista primeiro');
    });

    /**
     * A aba Encerrante saiu para o `apps/pwa-dono`. Os celulares que já tinham
     * o app guardam `pwa.activeTab = 'encerrante'` no localStorage — um valor
     * que não corresponde mais a tela nenhuma aqui.
     *
     * Sem a conferência de `ABAS_VALIDAS`, o app abriria no Registro com a
     * barra inferior sem nada selecionado: parece app quebrado para quem só
     * atualizou.
     */
    it('cai no Registro quando o localStorage guarda a aba que saiu do app', async () => {
        localStorage.setItem('pwa.activeTab', 'encerrante');

        await montar();

        // O título "Registro de Turno" saiu da tela em 19/08 (ganhava espaço no celular);
        // o que identifica a aba agora é o botão de envio, que só o Registro tem.
        expect(container.textContent).toContain('Enviar Registro');
        expect(container.textContent).not.toContain('Fotografar papel do encerrante');
    });

    it('não oferece mais a aba Encerrante na barra inferior', async () => {
        localStorage.setItem('pwa.activeTab', 'vendas');

        await montar();

        expect(container.textContent).not.toContain('Encerrante');
    });

    // Os cinco casos abaixo prendem o comportamento de `abaSecundaria` e da
    // barreira `SelecioneOFrentista` antes de saírem do App.tsx.

    it('historico sem frentista mostra a barreira com o botão de voltar', async () => {
        localStorage.setItem('pwa.activeTab', 'historico');

        await montar();

        expect(container.textContent).toContain('Selecione um frentista primeiro');
        const voltar = Array.from(container.querySelectorAll('button')).find((b) => /Voltar ao Registro/.test(b.textContent ?? ''));
        expect(voltar).toBeDefined();
        expect(mocks.getHistoricoFrentista).not.toHaveBeenCalled();
    });

    /** Medição é do TANQUE, não do frentista (#74): a aba abre sem escolher ninguém. */
    it('tanques sem frentista NÃO exige frentista', async () => {
        localStorage.setItem('pwa.activeTab', 'tanques');

        await montar();

        expect(container.textContent).not.toContain('Selecione um frentista primeiro');
    });

    it('historico com frentista abre a tela e busca o histórico dele', async () => {
        localStorage.setItem('pwa.activeTab', 'historico');
        localStorage.setItem('pwa.frentista', JSON.stringify({ id: 1, nome: 'Fulano' }));

        await montar();

        expect(container.textContent).not.toContain('Selecione um frentista primeiro');
        expect(mocks.getHistoricoFrentista).toHaveBeenCalledWith(1);
    });

    it('vendas com frentista abre a tela e busca os produtos', async () => {
        localStorage.setItem('pwa.activeTab', 'vendas');
        localStorage.setItem('pwa.frentista', JSON.stringify({ id: 1, nome: 'Fulano' }));

        await montar();

        expect(container.textContent).not.toContain('Selecione um frentista primeiro');
        expect(mocks.getProdutos).toHaveBeenCalled();
    });

    it('"Voltar ao Registro" na barreira leva ao Registro e grava a aba', async () => {
        localStorage.setItem('pwa.activeTab', 'historico');

        await montar();
        expect(container.textContent).not.toContain('Enviar Registro');

        const voltar = Array.from(container.querySelectorAll('button')).find((b) => /Voltar ao Registro/.test(b.textContent ?? ''))!;
        await clicar(voltar);

        expect(container.textContent).toContain('Enviar Registro');
        expect(container.textContent).not.toContain('Selecione um frentista primeiro');
        expect(localStorage.getItem('pwa.activeTab')).toBe('registro');
    });
});

describe('PWA do frentista — data e envios do dia', () => {
    beforeEach(() => {
        localStorage.clear();
        mocks.getEnviosDoDia.mockReset().mockResolvedValue([]);
        mocks.getOrCreateFechamento.mockReset().mockResolvedValue(1);
        mocks.submitFrentistaClosing.mockReset().mockResolvedValue({});
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        localStorage.clear();
    });

    it('restaura a data salva só se foi gravada hoje', async () => {
        localStorage.setItem('pwa.dataFechamento', JSON.stringify({ data: ontemIso(), gravadoEm: hojeIso() }));
        await montar();
        expect(container.textContent).toContain(`Enviados em ${ptBr(ontemIso())}`);
    });

    it('descarta a data salva em outro dia e cai em hoje', async () => {
        localStorage.setItem('pwa.dataFechamento', JSON.stringify({ data: '2026-01-01', gravadoEm: '2026-01-01' }));
        await montar();
        expect(container.textContent).toContain(`Enviados em ${ptBr(hojeIso())}`);
        expect(container.textContent).not.toContain('Este caixa NÃO é de hoje');
    });

    it('descarta o formato antigo (string pura) e cai em hoje', async () => {
        localStorage.setItem('pwa.dataFechamento', '2026-01-01');
        await montar();
        expect(container.textContent).toContain(`Enviados em ${ptBr(hojeIso())}`);
    });

    it('erro ao carregar envios não vira "nenhum envio"', async () => {
        mocks.getEnviosDoDia.mockRejectedValueOnce(new Error('rede caiu'));
        await montar();
        expect(container.textContent).toContain('Não deu para carregar os envios do dia');
        expect(container.textContent).not.toContain('Nenhum envio neste dia ainda');

        const tentar = Array.from(container.querySelectorAll('button')).find((b) => /tentar de novo/.test(b.textContent ?? ''))!;
        await clicar(tentar);
        expect(mocks.getEnviosDoDia).toHaveBeenCalledTimes(2);
        expect(container.textContent).toContain('Nenhum envio neste dia ainda');
    });

    it('bloqueia segundo envio do mesmo frentista no mesmo dia', async () => {
        localStorage.setItem('pwa.frentista', JSON.stringify({ id: 1, nome: 'Fulano' }));
        mocks.getEnviosDoDia.mockResolvedValue([
            { id: 10, frentista_id: 1, valor_conferido: 100, data_hora_envio: new Date().toISOString(), frentista: { nome: 'Fulano' } },
        ]);
        await montar();
        digitar(container.querySelector<HTMLInputElement>('input[placeholder="0,00"]')!, '10000');
        await clicar(botaoEnviar());

        expect(container.textContent).toContain('Já enviado');
        expect(container.textContent).toContain(`Fulano já enviou o fechamento de ${ptBr(hojeIso())}`);
        expect(mocks.getOrCreateFechamento).not.toHaveBeenCalled();
        expect(mocks.submitFrentistaClosing).not.toHaveBeenCalled();
    });

    it('rearma a confirmação de data diferente depois de uma falha no envio', async () => {
        localStorage.setItem('pwa.frentista', JSON.stringify({ id: 1, nome: 'Fulano' }));
        localStorage.setItem('pwa.dataFechamento', JSON.stringify({ data: ontemIso(), gravadoEm: hojeIso() }));
        mocks.submitFrentistaClosing.mockRejectedValue(new Error('servidor fora'));
        await montar();
        digitar(container.querySelector<HTMLInputElement>('input[placeholder="0,00"]')!, '10000');

        await clicar(botaoEnviar()); // 1º toque: arma
        expect(botaoEnviar().textContent).toContain('Toque de novo');
        await clicar(botaoEnviar()); // 2º toque: envia e falha
        expect(mocks.submitFrentistaClosing).toHaveBeenCalledTimes(1);
        expect(container.textContent).toContain('servidor fora');

        // Sem o reset, este toque enviaria direto. Tem que só rearmar.
        expect(botaoEnviar().textContent).toContain('Enviar Registro');
        await clicar(botaoEnviar());
        expect(mocks.submitFrentistaClosing).toHaveBeenCalledTimes(1);
        expect(botaoEnviar().textContent).toContain('Toque de novo');
    });
});
