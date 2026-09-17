import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reduzirParaAvatar, iniciais, TETO_DATA_URL } from './foto';

/**
 * O jsdom não decodifica imagem nem desenha: `Image` nunca dispara `onload` a
 * partir de uma data URL, e `canvas` não tem contexto 2d. Sem estes dois
 * dublês, todo teste da foto morre em "Canvas não suportado" antes de chegar
 * ao recorte — foi a mesma armadilha do teste do encerrante no app do dono.
 */
const getContextOriginal = HTMLCanvasElement.prototype.getContext;
const toDataURLOriginal = HTMLCanvasElement.prototype.toDataURL;
const ImageOriginal = globalThis.Image;

/** Registra os argumentos do recorte para o teste poder conferi-los. */
let desenhos: number[][] = [];
let saidaDoCanvas = 'data:image/jpeg;base64,QVZBVEFS';

/** @param largura,altura Dimensões que a "foto do celular" vai declarar. */
function dublarNavegador(largura: number, altura: number) {
    desenhos = [];

    HTMLCanvasElement.prototype.getContext = (() => ({
        drawImage: (_img: unknown, ...resto: number[]) => { desenhos.push(resto); },
    })) as unknown as HTMLCanvasElement['getContext'];

    HTMLCanvasElement.prototype.toDataURL = () => saidaDoCanvas;

    globalThis.Image = class {
        width = largura;
        height = altura;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_valor: string) {
            // Assíncrono de propósito: o código real faz `await` neste onload.
            queueMicrotask(() => this.onload?.());
        }
    } as unknown as typeof Image;
}

const arquivoFake = () => new File(['bytes'], 'perfil.jpg', { type: 'image/jpeg' });

beforeEach(() => {
    saidaDoCanvas = 'data:image/jpeg;base64,QVZBVEFS';
});

afterEach(() => {
    HTMLCanvasElement.prototype.getContext = getContextOriginal;
    HTMLCanvasElement.prototype.toDataURL = toDataURLOriginal;
    globalThis.Image = ImageOriginal;
    vi.restoreAllMocks();
});

describe('reduzirParaAvatar', () => {
    it('devolve a data URL JPEG que o canvas produziu', async () => {
        dublarNavegador(800, 800);

        await expect(reduzirParaAvatar(arquivoFake())).resolves.toBe('data:image/jpeg;base64,QVZBVEFS');
    });

    it('recorta o quadrado no centro de uma foto em pé, sem achatar o rosto', async () => {
        // Retrato 600x900: o corte é 600, e sobra 150 de margem em cima e embaixo.
        dublarNavegador(600, 900);

        await reduzirParaAvatar(arquivoFake(), 192);

        // drawImage(img, esquerda, topo, corte, corte, 0, 0, lado, lado)
        expect(desenhos[0]).toEqual([0, 150, 600, 600, 0, 0, 192, 192]);
    });

    it('recorta pela largura numa foto deitada', async () => {
        dublarNavegador(1000, 400);

        await reduzirParaAvatar(arquivoFake(), 192);

        expect(desenhos[0]).toEqual([300, 0, 400, 400, 0, 0, 192, 192]);
    });

    it('recusa a foto que estoura o teto da coluna, em vez de deixar o banco recusar', async () => {
        dublarNavegador(800, 800);
        saidaDoCanvas = 'data:image/jpeg;base64,' + 'A'.repeat(TETO_DATA_URL);

        await expect(reduzirParaAvatar(arquivoFake())).rejects.toThrow(/grande demais/);
    });

    it('avisa quando o navegador não tem canvas', async () => {
        dublarNavegador(800, 800);
        HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];

        await expect(reduzirParaAvatar(arquivoFake())).rejects.toThrow(/não consegue preparar/);
    });
});

describe('iniciais', () => {
    it('usa primeiro e último nome', () => {
        expect(iniciais('João Carlos Silva')).toBe('JS');
    });

    it('usa só a letra quando o nome é único', () => {
        expect(iniciais('Ana')).toBe('A');
    });

    it('não quebra com nome vazio', () => {
        expect(iniciais('   ')).toBe('?');
    });
});
