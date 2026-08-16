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
        expect(fechamento - inicial).toBeCloseTo(348.487, 3);
    });

    it('aceita valor sem casa decimal', () => {
        expect(numeroDoEncerrante('1.861.796')).toBeCloseTo(1861796, 3);
    });

    it('trata campo vazio, nulo e indefinido como zero', () => {
        expect(numeroDoEncerrante('')).toBe(0);
        expect(numeroDoEncerrante(null)).toBe(0);
        expect(numeroDoEncerrante(undefined)).toBe(0);
    });

    it('trata texto ilegível como zero em vez de NaN', () => {
        expect(numeroDoEncerrante('abc')).toBe(0);
    });
});
