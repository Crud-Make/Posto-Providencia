import { describe, it, expect } from 'vitest';
import { numeroDoEncerrante } from './encerrante-digitado';

describe('numeroDoEncerrante', () => {
    /**
     * O caso do bug. `replace('.', '')` sem `/g` devolvia 1861.796 — mil vezes
     * menor — e o valor ia para `Leitura.leitura_inicial` assim.
     */
    it('lê encerrante acima de 1 milhão, com DOIS separadores de milhar', () => {
        expect(numeroDoEncerrante('1.861.796,633')).toBeCloseTo(1861796.633, 3);
    });

    it('lê encerrante abaixo de 1 milhão, com um separador só', () => {
        expect(numeroDoEncerrante('652.606,432')).toBeCloseTo(652606.432, 3);
    });

    it('lê o Bico 06, que fica na casa dos milhares', () => {
        expect(numeroDoEncerrante('4.339,420')).toBeCloseTo(4339.42, 3);
    });

    /**
     * O par real que o bug corrompia: o dia rendia 348,487 L e ia para o banco
     * como 0,349 L. A tela já mostrava o valor certo — quem errava era a
     * gravação.
     */
    it('preserva os litros do dia entre duas leituras reais', () => {
        const inicial = numeroDoEncerrante('1.861.796,633');
        const fechamento = numeroDoEncerrante('1.862.145,120');
        // Guarda explícita em vez de `!`: se a leitura virar null, o teste
        // acusa a causa em vez de estourar num NaN silencioso na subtração.
        if (inicial === null || fechamento === null) {
            throw new Error(
                `numeroDoEncerrante devolveu null para leitura válida: inicial=${inicial}, fechamento=${fechamento}`
            );
        }
        expect(fechamento - inicial).toBeCloseTo(348.487, 3);
    });

    it('aceita valor sem casa decimal', () => {
        expect(numeroDoEncerrante('1.861.796')).toBeCloseTo(1861796, 3);
    });

    /**
     * NULO, NUNCA ZERO — e a diferença já custou um bug.
     *
     * A primeira versão devolvia `0` para campo vazio. Como o filtro de
     * gravação comparava `final > inicial`, uma linha com inicial em branco
     * passava (`final > 0`) e gravava `leitura_inicial: 0` — o odômetro
     * inteiro virando litros vendidos do dia. O `parseFloat` que ela
     * substituiu devolvia `NaN`, e `NaN` derrubava a linha no filtro.
     */
    it('devolve null para campo vazio, nulo e indefinido — nunca zero', () => {
        expect(numeroDoEncerrante('')).toBeNull();
        expect(numeroDoEncerrante('   ')).toBeNull();
        expect(numeroDoEncerrante(null)).toBeNull();
        expect(numeroDoEncerrante(undefined)).toBeNull();
    });

    it('devolve null para texto ilegível', () => {
        expect(numeroDoEncerrante('abc')).toBeNull();
    });

    /** Zero DIGITADO é valor legítimo: bico que não girou. Não confundir com vazio. */
    it('distingue zero digitado de campo vazio', () => {
        expect(numeroDoEncerrante('0,000')).toBe(0);
        expect(numeroDoEncerrante('')).toBeNull();
    });
});
