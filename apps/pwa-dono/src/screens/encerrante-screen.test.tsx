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

/** Um dia passado sem encerrante completo, como o `api-core` devolve. */
interface DiaEmFalta {
    data: string;
    bicosLancados: number;
    bicosEsperados: number;
}

// Mutáveis: cada teste ajusta o cenário antes de montar.
let ultimasLeituras = new Map<number, number>();
// Preço praticado no último dia lançado. Vazio por padrão: o bico cai no cadastro,
// que é o que os testes existentes já esperavam.
let ultimosPrecos = new Map<number, number>();
let respostaOcr: LeituraOcr[] = [];
let erroOcr: Error | null = null;
let faltas: DiaEmFalta[] = [];

const salvarLeituras = vi.fn<(payload: unknown) => Promise<unknown[]>>(async () => []);
const lerEncerrante = vi.fn<(base64: string, mimeType: string) => Promise<typeof respostaOcr>>(async () => {
    if (erroOcr) throw erroOcr;
    return respostaOcr;
});

vi.mock('../services/api', () => ({
    api: {
        getBicos: async () => BICOS,
        getUltimasLeiturasPorBico: async () => ultimasLeituras,
        getUltimosPrecosPorBico: async () => ultimosPrecos,
        aquecerEncerrante: () => { },
        diasEmFalta: async () => faltas,
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

/**
 * Deixa as promises pendentes (FileReader → Image → OCR) resolverem.
 *
 * @remarks Escoa VÁRIAS voltas de propósito. A cadeia da foto tem três saltos
 *          assíncronos encadeados, e uma volta só de macrotask basta na
 *          máquina ociosa mas não sob carga — com a suíte inteira rodando em
 *          paralelo, o teste virava intermitente. Esperar o suficiente é de
 *          graça; falhar de vez em quando custa a confiança na suíte toda.
 */
const escoar = async () => {
    for (let volta = 0; volta < 5; volta++) {
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    }
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
        ultimosPrecos = new Map<number, number>();
        ultimasLeituras = new Map<number, number>([
            [10, 1861796.633],
            [11, 500000],
        ]);
        respostaOcr = [];
        erroOcr = null;
        faltas = [];
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
     * A máscara: os 3 últimos dígitos são os mililitros, sempre. Quem lê o
     * papel digita os dígitos na ordem e a vírgula se posiciona sozinha — sem
     * ela, esquecer a vírgula produzia um número mil vezes maior (`1740317000`
     * virava um bilhão e setecentos milhões de litros).
     */
    it('põe a vírgula sozinha nos três últimos dígitos', async () => {
        await montar();

        digitar(campos()[0], '1740317000');

        expect(campos()[0].value).toBe('1.740.317,000');
    });

    it('aceita quem digita a vírgula também — o resultado é o mesmo', async () => {
        await montar();

        digitar(campos()[0], '1740317,000');

        expect(campos()[0].value).toBe('1.740.317,000');
    });

    it('monta o número dígito a dígito enquanto se digita', async () => {
        await montar();

        digitar(campos()[0], '6');
        expect(campos()[0].value).toBe('0,006');

        digitar(campos()[0], '6550');
        expect(campos()[0].value).toBe('6,550');

        digitar(campos()[0], '6550000');
        expect(campos()[0].value).toBe('6.550,000');
    });

    it('volta a vazio quando o campo é apagado', async () => {
        await montar();
        digitar(campos()[0], '6550000');

        digitar(campos()[0], '');

        expect(campos()[0].value).toBe('');
    });

    /**
     * O encerrante passou a depender de UMA pessoa. Antes, três turnos davam
     * três chances por dia de alguém lembrar; agora, esquecer um dia não
     * produz sinal nenhum — o `total_vendas` daquele dia fica no que estava e o
     * fechamento não concilia, calado.
     */
    it('mostra os dias passados sem encerrante completo', async () => {
        faltas = [
            { data: '2026-08-14', bicosLancados: 0, bicosEsperados: 2 },
            { data: '2026-08-15', bicosLancados: 1, bicosEsperados: 2 },
        ];
        await montar();
        await escoar();

        expect(container.textContent).toContain('2 dias sem o encerrante completo');
        expect(container.textContent).toContain('14/08');
        expect(container.textContent).toContain('nenhum bico');
        expect(container.textContent).toContain('15/08');
        expect(container.textContent).toContain('1 de 2 bicos');
    });

    /** Aviso que aparece sempre deixa de ser lido: sem falta, sem bloco. */
    it('fica calado quando não há dia em falta', async () => {
        faltas = [];
        await montar();
        await escoar();

        expect(container.textContent).not.toContain('sem o encerrante completo');
    });

    it('usa singular quando só um dia está em falta', async () => {
        faltas = [{ data: '2026-08-15', bicosLancados: 0, bicosEsperados: 2 }];
        await montar();
        await escoar();

        expect(container.textContent).toContain('1 dia sem o encerrante completo');
        expect(container.textContent).not.toContain('1 dias');
    });

    /**
     * Migrado do `App.test.tsx` do PWA do frentista, junto com a tela.
     *
     * f000f9a: antes, o botão só destravava depois de um OCR bem-sucedido, e
     * quem estava na bomba digitava as seis leituras à mão para descobrir no
     * fim que não dava para enviar. O caminho manual é a saída quando a foto
     * sai tremida ou a rede do posto cai — sem passar por foto nenhuma.
     */
    it('libera o envio com valor digitado à mão, sem foto alguma', async () => {
        await montar();
        expect(botaoEnviar().disabled).toBe(true);

        digitar(campos()[0], '1.862.500,000');

        expect(botaoEnviar().disabled).toBe(false);
    });

    /** Migrado do `App.test.tsx` do frentista: zero não é valor para enviar. */
    it('mantém o envio travado enquanto nenhum bico tem valor', async () => {
        await montar();

        digitar(campos()[0], '0,000');

        expect(botaoEnviar().disabled).toBe(true);
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

    /**
     * O cadastro guarda o preço de HOJE. Lançar um dia passado com ele produz o
     * valor errado sem nenhum aviso: em 19/08/2026 o replay de 01/01 fechou em
     * R$ 10.503,77 contra R$ 9.430,34 da planilha, porque a gasolina valia 6,98
     * no cadastro e 6,28 naquele dia. O preço do último dia lançado manda.
     */
    it('grava o preço do último dia lançado, não o do cadastro', async () => {
        ultimosPrecos = new Map<number, number>([[10, 6.28]]);
        await montar();
        digitar(campos()[0], '1.861.900,500');

        await act(async () => {
            botaoEnviar().click();
        });
        await escoar();

        const [payload] = salvarLeituras.mock.calls[0] as unknown as [
            { linhas: Array<{ preco_litro: number }> },
        ];
        expect(payload.linhas[0].preco_litro).toBe(6.28);
    });

    /**
     * Sem dia anterior não há o que herdar, e aí o cadastro é a única fonte —
     * é o caso do primeiro lançamento do posto, e do bico recém-instalado.
     */
    it('cai no preço do cadastro quando não há dia anterior lançado', async () => {
        ultimosPrecos = new Map<number, number>();
        await montar();
        digitar(campos()[0], '1.861.900,500');

        await act(async () => {
            botaoEnviar().click();
        });
        await escoar();

        const [payload] = salvarLeituras.mock.calls[0] as unknown as [
            { linhas: Array<{ preco_litro: number }> },
        ];
        expect(payload.linhas[0].preco_litro).toBe(6.98);
    });
});
