import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// Mesmo motivo do App.test.tsx: sem @testing-library instalado, é aqui que se
// avisa o React 19 de que este ambiente suporta `act(...)`.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Uma linha do que a Edge Function `ler-encerrante` devolve por bico. */
interface LeituraOcr {
    bico: string;
    numero: string | null;
    /** `false` = as duas chamadas do Gemini divergiram nesse bico. */
    confianca: boolean;
}

const BICOS = [
    { id: 10, numero: 1, combustivel_id: 1, combustivel: { nome: 'Gasolina Comum', preco_venda: 6.98 } },
    { id: 11, numero: 2, combustivel_id: 2, combustivel: { nome: 'Etanol', preco_venda: 4.5 } },
];

// Mutáveis: cada teste ajusta o cenário antes de montar.
let ultimasLeituras = new Map<number, number>();
let respostaOcr: LeituraOcr[] = [];
let erroOcr: Error | null = null;

const salvarLeituras = vi.fn(async (_payload: unknown) => []);
const lerEncerrante = vi.fn(async (_base64: string, _mimeType: string) => {
    if (erroOcr) throw erroOcr;
    return respostaOcr;
});

vi.mock('../services/api', () => ({
    api: {
        getBicos: async () => BICOS,
        getUltimasLeiturasPorBico: async () => ultimasLeituras,
        aquecerEncerrante: () => { },
        lerEncerrante: (...args: [string, string]) => lerEncerrante(...args),
        salvarLeituras: (...args: Parameters<typeof salvarLeituras>) => salvarLeituras(...args),
    },
}));

const EncerranteScreen = (await import('./EncerranteScreen')).default;

let container: HTMLDivElement;
let root: Root;

/**
 * `fileParaBase64Reduzido` reduz a foto com `Image` + `<canvas>` nativos, e o
 * jsdom não decodifica imagem nem tem contexto 2d: sem estes dois stubs o
 * caminho da foto morre em "Canvas não suportado" antes de chegar ao OCR, e o
 * teste passaria a medir o jsdom em vez da tela.
 */
const stubarPipelineDeImagem = () => {
    class ImagemFake {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 2000;
        height = 1500;
        set src(_valor: string) {
            queueMicrotask(() => this.onload?.());
        }
        get src() {
            return '';
        }
    }
    vi.stubGlobal('Image', ImagemFake);

    HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage: () => { },
    })) as unknown as HTMLCanvasElement['getContext'];
    HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,Rk9UTw==';
};

const montar = async () => {
    await act(async () => {
        root.render(React.createElement(EncerranteScreen, { onVoltar: () => { } }));
    });
};

/** Deixa as promises pendentes (FileReader, Image, OCR) resolverem. */
const escoar = async () => {
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
    });
};

const digitar = (input: HTMLInputElement, texto: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    act(() => {
        setter?.call(input, texto);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
};

const fotografar = async () => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const arquivo = new File(['bytes-da-foto'], 'encerrante.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [arquivo], configurable: true });
    await act(async () => {
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await escoar();
};

const campos = () =>
    [...container.querySelectorAll('input[inputmode="decimal"]')] as HTMLInputElement[];

const botaoEnviar = () =>
    [...container.querySelectorAll('button')].find(b =>
        b.textContent?.includes('Enviar Leituras'),
    ) as HTMLButtonElement;

describe('EncerranteScreen — caminho da foto', () => {
    beforeEach(() => {
        ultimasLeituras = new Map<number, number>([
            [10, 1861796.633],
            [11, 500000],
        ]);
        respostaOcr = [];
        erroOcr = null;
        salvarLeituras.mockClear();
        lerEncerrante.mockClear();
        stubarPipelineDeImagem();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => root.unmount());
        container.remove();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    /**
     * O papel lista os bicos por NÚMERO (1..6) e o banco os identifica por ID.
     * A tradução número→id é invisível na tela e é o primeiro lugar onde uma
     * reescrita silenciosamente troca as leituras de bico.
     */
    it('distribui a leitura da foto pelo número do bico, não pela ordem da lista', async () => {
        respostaOcr = [
            { bico: '2', numero: '500100.000', confianca: true },
            { bico: '1', numero: '1861900.500', confianca: true },
        ];
        await montar();
        await fotografar();

        expect(campos()[0].value).toBe('1.861.900,500');
        expect(campos()[1].value).toBe('500.100,000');
    });

    /**
     * A auto-conferência chama o Gemini duas vezes e compara (99e287d). Um bico
     * onde as duas leituras divergiram precisa chegar destacado ao dono — é a
     * diferença entre conferir um número e confiar num palpite.
     */
    it('destaca o bico em que a conferência automática divergiu', async () => {
        respostaOcr = [
            { bico: '1', numero: '1861900.500', confianca: true },
            { bico: '2', numero: '500100.000', confianca: false },
        ];
        await montar();
        await fotografar();

        expect(container.textContent).toContain('ficaram em dúvida');
        expect(container.textContent).toContain('A leitura ficou em dúvida na conferência automática.');
    });

    it('limpa a dúvida do bico assim que o número é corrigido à mão', async () => {
        respostaOcr = [{ bico: '2', numero: '500100.000', confianca: false }];
        await montar();
        await fotografar();
        expect(container.textContent).toContain('A leitura ficou em dúvida na conferência automática.');

        digitar(campos()[1], '500.150,000');

        expect(container.textContent).not.toContain('A leitura ficou em dúvida na conferência automática.');
    });

    /**
     * f000f9a: o OCR é o caminho feliz, não o único. Foto tremida, rede caindo
     * no posto ou função fria não podem deixar quem está na bomba sem saída.
     */
    it('mantém a digitação viva quando o OCR falha', async () => {
        erroOcr = new Error('Não consegui ler a foto. Tente novamente.');
        await montar();
        await fotografar();

        expect(container.textContent).toContain('Não consegui ler a foto');
        expect(botaoEnviar().disabled).toBe(true);

        digitar(campos()[0], '1.861.900,500');

        expect(botaoEnviar().disabled).toBe(false);
    });

    /**
     * A bomba não anda para trás. Quando anda, é dígito trocado — e o commit
     * a7f495d anotou o risco irmão: `Math.max(0, final − inicial)` faz o dia
     * valer venda ZERO em silêncio se o número vier pequeno demais.
     */
    it('avisa quando a leitura final é menor que a anterior', async () => {
        await montar();
        digitar(campos()[0], '1.000.000,000'); // anterior é 1.861.796,633

        expect(container.textContent).toContain('Leitura final menor que a anterior');
    });

    it('avisa quando a diferença passa do teto plausível do turno', async () => {
        await montar();
        digitar(campos()[0], '1.865.796,633'); // +4.000 L, acima dos 3000 L

        expect(container.textContent).toContain('confira o número');
    });

    /** Aviso que não segura ninguém é aviso decorativo: recusar tem de cancelar. */
    it('não envia nada quando o aviso é recusado na confirmação', async () => {
        const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
        await montar();
        digitar(campos()[0], '1.000.000,000'); // dispara o aviso

        await act(async () => {
            botaoEnviar().click();
        });

        expect(confirmar).toHaveBeenCalled();
        expect(salvarLeituras).not.toHaveBeenCalled();
    });

    /**
     * Primeiro envio de um bico: sem leitura anterior, a base vira o próprio
     * valor lido, então o dia fecha com 0 L em vez de faturar o odômetro
     * inteiro da bomba como venda do turno.
     */
    it('usa o próprio valor como base quando o bico não tem leitura anterior', async () => {
        ultimasLeituras = new Map<number, number>();
        await montar();
        digitar(campos()[0], '1.861.900,500');

        await act(async () => {
            botaoEnviar().click();
        });
        await escoar();

        expect(salvarLeituras).toHaveBeenCalledTimes(1);
        const [payload] = salvarLeituras.mock.calls[0] as unknown as [
            { linhas: Array<{ leitura_inicial: number; leitura_final: number }> },
        ];
        expect(payload.linhas).toHaveLength(1);
        expect(payload.linhas[0].leitura_inicial).toBe(1861900.5);
        expect(payload.linhas[0].leitura_final).toBe(1861900.5);
    });
});
