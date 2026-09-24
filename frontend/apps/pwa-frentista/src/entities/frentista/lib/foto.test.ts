import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reduzirParaAvatar, iniciais, mensagemDeFoto, TETO_DATA_URL } from './foto';

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

/**
 * O contrato deixou de ser "resolve ou lança" e virou `Result`, então cada
 * teste precisa consumi-lo — a `neverthrow/must-use-result` (RES-2) não deixa
 * passar um `Result` solto, e passar o resultado para um helper próprio também
 * não conta como consumo. Por isso o `match` e o `unwrapOr` aparecem em cada
 * teste: é o consumo **no ponto**, exigido pelo lint.
 */
describe('reduzirParaAvatar', () => {
    it('devolve a data URL JPEG que o canvas produziu', async () => {
        dublarNavegador(800, 800);

        const resultado = await reduzirParaAvatar(arquivoFake());

        // `unwrapOr` devolve o fallback se for `Err` — logo isto cobre os dois canais.
        expect(resultado.unwrapOr('ERRO')).toBe('data:image/jpeg;base64,QVZBVEFS');
    });

    it('recorta o quadrado no centro de uma foto em pé, sem achatar o rosto', async () => {
        // Retrato 600x900: o corte é 600, e sobra 150 de margem em cima e embaixo.
        dublarNavegador(600, 900);

        const resultado = await reduzirParaAvatar(arquivoFake(), 192);

        expect(resultado.match(() => null, (erro) => erro.tipo)).toBeNull();
        // drawImage(img, esquerda, topo, corte, corte, 0, 0, lado, lado)
        expect(desenhos[0]).toEqual([0, 150, 600, 600, 0, 0, 192, 192]);
    });

    it('recorta pela largura numa foto deitada', async () => {
        dublarNavegador(1000, 400);

        const resultado = await reduzirParaAvatar(arquivoFake(), 192);

        expect(resultado.match(() => null, (erro) => erro.tipo)).toBeNull();
        expect(desenhos[0]).toEqual([300, 0, 400, 400, 0, 0, 192, 192]);
    });

    it('recusa a foto que estoura o teto da coluna, em vez de deixar o banco recusar', async () => {
        dublarNavegador(800, 800);
        saidaDoCanvas = 'data:image/jpeg;base64,' + 'A'.repeat(TETO_DATA_URL);

        const resultado = await reduzirParaAvatar(arquivoFake());

        expect(resultado.unwrapOr('PASSOU')).toBe('PASSOU');
        expect(resultado.match(() => null, (erro) => erro.tipo)).toBe('foto_grande_demais');
        // A frase é o que o frentista lê na tela: não pode sumir na refatoração.
        expect(resultado.match(() => '', mensagemDeFoto)).toMatch(/grande demais/);
    });

    it('avisa quando o navegador não tem canvas', async () => {
        dublarNavegador(800, 800);
        HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];

        const resultado = await reduzirParaAvatar(arquivoFake());

        expect(resultado.unwrapOr('PASSOU')).toBe('PASSOU');
        expect(resultado.match(() => null, (erro) => erro.tipo)).toBe('sem_canvas');
        expect(resultado.match(() => '', mensagemDeFoto)).toMatch(/não consegue preparar/);
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

    it('não quebra com nome de um caractere só', () => {
        expect(iniciais('A')).toBe('A');
    });
});
