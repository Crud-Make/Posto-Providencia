import { describe, it, expect } from 'vitest';
import {
    INTERVALO_SINAL_MS,
    LIMITE_AUSENTE_MS,
    LIMITE_ONLINE_MS,
    descreverPresenca,
    msDesde,
    presencasRelevantes,
    statusPresenca,
    type PresencaFrentista,
} from './presenca';

/** Instante fixo: teste de tempo com relógio real vira teste que falha sozinho de madrugada. */
const AGORA = new Date('2026-08-02T23:00:00-03:00');

/** @param min Minutos ANTES de {@link AGORA}. */
const atras = (min: number) => new Date(AGORA.getTime() - min * 60_000);

describe('statusPresenca', () => {
    it('trata sinal recém-chegado como online', () => {
        expect(statusPresenca(AGORA, AGORA)).toBe('online');
        expect(statusPresenca(atras(5), AGORA)).toBe('online');
    });

    it('tolera 2 sinais perdidos antes de rebaixar para ausente', () => {
        const noLimite = new Date(AGORA.getTime() - LIMITE_ONLINE_MS);
        expect(statusPresenca(noLimite, AGORA)).toBe('online');

        const umSegundoDepois = new Date(AGORA.getTime() - LIMITE_ONLINE_MS - 1000);
        expect(statusPresenca(umSegundoDepois, AGORA)).toBe('ausente');
    });

    it('vira offline depois da janela de ausente', () => {
        const noLimite = new Date(AGORA.getTime() - LIMITE_AUSENTE_MS);
        expect(statusPresenca(noLimite, AGORA)).toBe('ausente');

        expect(statusPresenca(atras(31), AGORA)).toBe('offline');
        expect(statusPresenca(atras(60 * 8), AGORA)).toBe('offline');
    });

    /**
     * O carimbo vem do relógio do servidor e o `agora` do navegador do dono. Se
     * o navegador estiver atrasado, a subtração dá negativo — e um frentista que
     * acabou de dar sinal não pode aparecer como qualquer coisa além de online.
     */
    it('não quebra com relógio do painel atrasado', () => {
        const futuro = new Date(AGORA.getTime() + 45_000);
        expect(msDesde(futuro, AGORA)).toBe(0);
        expect(statusPresenca(futuro, AGORA)).toBe('online');
        expect(descreverPresenca(futuro, AGORA)).toBe('agora mesmo');
    });

    it('o intervalo de sinal cabe folgado dentro da janela de online', () => {
        expect(LIMITE_ONLINE_MS).toBeGreaterThan(INTERVALO_SINAL_MS * 2);
    });
});

describe('descreverPresenca', () => {
    it('descreve minutos, horas e dias', () => {
        expect(descreverPresenca(atras(0), AGORA)).toBe('agora mesmo');
        expect(descreverPresenca(atras(1), AGORA)).toBe('há 1 min');
        expect(descreverPresenca(atras(12), AGORA)).toBe('há 12 min');
        expect(descreverPresenca(atras(59), AGORA)).toBe('há 59 min');
        expect(descreverPresenca(atras(60), AGORA)).toBe('há 1 h');
        expect(descreverPresenca(atras(60 * 5), AGORA)).toBe('há 5 h');
        expect(descreverPresenca(atras(60 * 24), AGORA)).toBe('há 1 dia');
        expect(descreverPresenca(atras(60 * 24 * 3), AGORA)).toBe('há 3 dias');
    });

    /** Arredondar para cima faria o dono ligar para quem sumiu há bem menos tempo. */
    it('arredonda para baixo', () => {
        expect(descreverPresenca(atras(3.9), AGORA)).toBe('há 3 min');
        expect(descreverPresenca(atras(119), AGORA)).toBe('há 1 h');
    });
});

describe('presencasRelevantes', () => {
    const p = (frentistaId: number, nome: string, minAtras: number): PresencaFrentista =>
        ({ frentistaId, nome, vistoEm: atras(minAtras) });

    it('ordena do mais recente para o mais antigo', () => {
        const lista = [p(1, 'Paulo', 45), p(2, 'Maria', 2), p(3, 'João', 12)];

        expect(presencasRelevantes(lista, AGORA).map(x => x.nome)).toEqual(['Maria', 'João', 'Paulo']);
    });

    /** Sem isso, o turno de ontem aparece junto do de hoje e o dono não distingue. */
    it('descarta quem passou de 12h', () => {
        const lista = [p(1, 'Paulo', 60 * 3), p(2, 'Ontem', 60 * 13)];

        expect(presencasRelevantes(lista, AGORA).map(x => x.nome)).toEqual(['Paulo']);
    });

    it('devolve lista vazia quando ninguém abriu o app', () => {
        expect(presencasRelevantes([], AGORA)).toEqual([]);
    });

    it('não altera a lista recebida', () => {
        const lista = [p(1, 'Paulo', 45), p(2, 'Maria', 2)];
        presencasRelevantes(lista, AGORA);

        expect(lista.map(x => x.nome)).toEqual(['Paulo', 'Maria']);
    });
});
