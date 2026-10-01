import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { juntarEnvios, lerEnviosDoDia, type EnvioDaApi } from './envios';
import { esquecerToken, guardarToken } from './sessao';

const envio = (id: number, frentistaId: number, hora: string | null, diferenca: string | null): EnvioDaApi => ({
    id,
    fechamento_id: 1,
    frentista_id: frentistaId,
    valor_conferido: '1500.50',
    encerrante: null,
    diferenca_calculada: diferenca,
    data_hora_envio: hora,
});

const EQUIPE = [
    { id: 7, nome: 'Ana Souza', foto: 'https://fotos/ana.jpg' },
    { id: 8, nome: 'Bruno Lima', foto: null },
];

describe('envios dos frentistas (API → tela)', () => {
    /** A API ordena por frentista; a tela mostra do envio mais antigo para o mais novo. */
    it('ordena pela hora do envio e junta nome e foto da equipe', () => {
        const linhas = juntarEnvios(
            [envio(1, 8, '2026-09-30T21:10:00Z', '0.00'), envio(2, 7, '2026-09-30T13:05:00Z', '12.50')],
            EQUIPE,
        );

        expect(linhas.map((l) => l.id)).toEqual([2, 1]);
        expect(linhas[0]?.frentista).toEqual({ nome: 'Ana Souza', foto: 'https://fotos/ana.jpg' });
        expect(linhas[1]?.frentista).toEqual({ nome: 'Bruno Lima', foto: null });
        expect(linhas[0]?.valor_conferido).toBe(1500.5);
        expect(linhas[0]?.diferenca_calculada).toBe(12.5);
    });

    /** "Sem apurar" não é "bateu": `null` não pode virar zero no caminho. */
    it('mantém a diferença não apurada como null, distinta de zero', () => {
        const [semApurar, bateu] = juntarEnvios(
            [envio(1, 7, '2026-09-30T10:00:00Z', null), envio(2, 8, '2026-09-30T11:00:00Z', '0.00')],
            EQUIPE,
        );

        expect(semApurar?.diferenca_calculada).toBeNull();
        expect(bateu?.diferenca_calculada).toBe(0);
        expect(semApurar?.encerrante).toBeNull();
    });

    it('frentista fora da equipe fica sem nome; envio sem hora vai para o fim', () => {
        const linhas = juntarEnvios([envio(1, 99, null, null), envio(2, 7, '2026-09-30T10:00:00Z', null)], EQUIPE);

        expect(linhas.map((l) => l.id)).toEqual([2, 1]);
        expect(linhas[1]?.frentista).toBeNull();
    });
});

describe('lerEnviosDoDia', () => {
    const urls: string[] = [];
    let respostas: Record<string, Response>;

    beforeEach(() => {
        urls.length = 0;
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubGlobal('fetch', async (url: string) => {
            urls.push(url);
            const caminho = new URL(url).pathname;
            return respostas[caminho] ?? new Response('{}', { status: 404 });
        });
        guardarToken('tok');
    });

    afterEach(() => {
        esquecerToken();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status });

    it('busca as sessões do dia e a equipe do posto escolhido', async () => {
        respostas = {
            '/api/postos/2/sessoes': json({ data: [envio(1, 7, '2026-09-30T10:00:00Z', '0.00')] }),
            '/api/postos/2/equipe': json({ data: EQUIPE.map((f) => ({ ...f, data_admissao: '2024-01-01T00:00:00Z', ativo: true })) }),
        };

        const lido = await lerEnviosDoDia(2, '2026-09-30');

        expect(lido._unsafeUnwrap()[0]?.frentista?.nome).toBe('Ana Souza');
        expect(urls).toContain('http://api.teste/api/postos/2/sessoes?data=2026-09-30');
    });

    /** Conta sem `gerir` não lê a equipe; o dinheiro dos envios aparece mesmo assim. */
    it('equipe proibida (403) não esconde os envios', async () => {
        respostas = {
            '/api/postos/2/sessoes': json({ data: [envio(1, 7, '2026-09-30T10:00:00Z', '5.00')] }),
            '/api/postos/2/equipe': json({ message: 'proibido' }, 403),
        };

        const lido = await lerEnviosDoDia(2, '2026-09-30');

        expect(lido.isOk()).toBe(true);
        expect(lido._unsafeUnwrap()[0]).toMatchObject({ frentista: null, diferenca_calculada: 5 });
    });
});
