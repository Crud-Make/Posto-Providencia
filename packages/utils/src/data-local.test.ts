import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    paraIsoLocal,
    paraMesLocal,
    deIsoLocal,
    hojeIso,
    mesAtualIso,
    primeiroDiaDoMes,
    ultimoDiaDoMes,
    somarDias,
} from './data-local';

/**
 * 2026-08-01T00:37:00Z é 31/07/2026 às 21:37 em GMT-3 — o instante exato em que o painel
 * do proprietário foi encontrado apagado, em 31/07/2026.
 */
const NOITE_DA_VIRADA = new Date('2026-08-01T00:37:00.000Z');

/** Só faz sentido travar o comportamento onde o fuso realmente desloca o dia. */
const offsetHoras = -NOITE_DA_VIRADA.getTimezoneOffset() / 60;
const fusoDeslocaODia = offsetHoras < 0;

describe('data-local — a armadilha do toISOString()', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it.skipIf(!fusoDeslocaODia)(
        'às 21h37 de 31/07 em GMT-3, hoje ainda é julho — toISOString() já diz agosto',
        () => {
            vi.useFakeTimers();
            vi.setSystemTime(NOITE_DA_VIRADA);

            // O que o código fazia antes, em 41 lugares do monorepo.
            // eslint-disable-next-line no-restricted-syntax -- demonstra o bug de propósito
            expect(new Date().toISOString().split('T')[0]).toBe('2026-08-01');

            // O que ele faz agora.
            expect(hojeIso()).toBe('2026-07-31');
            expect(mesAtualIso()).toBe('2026-07');
            expect(primeiroDiaDoMes()).toBe('2026-07-01');
            expect(ultimoDiaDoMes()).toBe('2026-07-31');
        }
    );

    it.skipIf(!fusoDeslocaODia)('subtrair dias de "agora" não arrasta o erro de fuso junto', () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOITE_DA_VIRADA);

        // 30 dias antes de 31/07 é 01/07 — não 02/07, que é o que o UTC devolvia.
        expect(somarDias(new Date(), -30)).toBe('2026-07-01');
    });
});

describe('paraIsoLocal', () => {
    it('formata a data local com zero à esquerda', () => {
        expect(paraIsoLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(paraIsoLocal(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('ignora a hora do dia — data de calendário não tem hora', () => {
        expect(paraIsoLocal(new Date(2026, 6, 31, 23, 59, 59))).toBe('2026-07-31');
        expect(paraIsoLocal(new Date(2026, 6, 31, 0, 0, 0))).toBe('2026-07-31');
    });
});

describe('deIsoLocal — o mesmo erro, do lado da leitura', () => {
    it('lê o dia certo, ao contrário do construtor com string', () => {
        const d = deIsoLocal('2026-07-31');
        expect(d.getDate()).toBe(31);
        expect(d.getMonth()).toBe(6);
        expect(d.getFullYear()).toBe(2026);
    });

    it.skipIf(!fusoDeslocaODia)('new Date(string) devolveria o dia anterior em GMT-3', () => {
        // Este era o bug do agrupamento semanal em useFluxoCaixa.
        expect(new Date('2026-07-31').getDate()).toBe(30);
        expect(deIsoLocal('2026-07-31').getDate()).toBe(31);
    });

    it('faz ida e volta com paraIsoLocal', () => {
        for (const iso of ['2026-01-01', '2026-07-31', '2026-12-31', '2026-02-28']) {
            expect(paraIsoLocal(deIsoLocal(iso))).toBe(iso);
        }
    });
});

describe('limites de mês', () => {
    it('primeiro e último dia, inclusive em fevereiro', () => {
        expect(primeiroDiaDoMes(new Date(2026, 1, 15))).toBe('2026-02-01');
        expect(ultimoDiaDoMes(new Date(2026, 1, 15))).toBe('2026-02-28');
        expect(ultimoDiaDoMes(new Date(2024, 1, 15))).toBe('2024-02-29'); // bissexto
    });

    it('paraMesLocal devolve aaaa-mm', () => {
        expect(paraMesLocal(new Date(2026, 6, 31))).toBe('2026-07');
    });
});

describe('somarDias', () => {
    it('atravessa a virada de mês e de ano', () => {
        expect(somarDias(new Date(2026, 6, 31), 1)).toBe('2026-08-01');
        expect(somarDias(new Date(2026, 0, 1), -1)).toBe('2025-12-31');
        expect(somarDias(new Date(2026, 6, 15), 0)).toBe('2026-07-15');
    });
});
