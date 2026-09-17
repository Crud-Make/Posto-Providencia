import { describe, it, expect } from 'vitest';
import { numeroDoCampo, textoDoCampo } from './campo-numerico';

describe('numeroDoCampo', () => {
    it('lê vírgula como separador decimal', () => {
        expect(numeroDoCampo('22158,46')).toBe(22158.46);
        expect(numeroDoCampo('0,473')).toBe(0.473);
    });

    it('lê ponto como decimal quando não há vírgula', () => {
        // Sem milhar na entrada, um ponto só pode ser decimal — é o que torna a
        // leitura determinística.
        expect(numeroDoCampo('0.473')).toBe(0.473);
    });

    it('aceita valor colado com milhar, sem cair na armadilha do R$ 7.436', () => {
        // O parser antigo (`analisarValor`) devolvia 7,44 para esta entrada.
        expect(numeroDoCampo('7.436,00')).toBe(7436);
        expect(numeroDoCampo('1.234,56')).toBe(1234.56);
        expect(numeroDoCampo('241.195,00')).toBe(241195);
    });

    it('devolve null para vazio, e não zero', () => {
        // A diferença importa: zero é medição legítima ("o tanque secou"),
        // vazio é ausência de medição. Confundir os dois vira perda inventada.
        expect(numeroDoCampo('')).toBeNull();
        expect(numeroDoCampo('   ')).toBeNull();
        expect(numeroDoCampo(undefined)).toBeNull();
    });

    it('devolve null para texto ilegível', () => {
        expect(numeroDoCampo('abc')).toBeNull();
        expect(numeroDoCampo('1,2,3')).toBeNull();
    });

    it('preserva o zero digitado', () => {
        expect(numeroDoCampo('0')).toBe(0);
        expect(numeroDoCampo('0,00')).toBe(0);
    });
});

describe('textoDoCampo', () => {
    it('escreve com vírgula decimal e sem milhar', () => {
        expect(textoDoCampo(22158.46, 2)).toBe('22158,46');
        expect(textoDoCampo(241195, 2)).toBe('241195');
    });

    it('corta zeros à direita', () => {
        // "7392,000" não é como o dono escreveria a régua à mão.
        expect(textoDoCampo(7392, 3)).toBe('7392');
        expect(textoDoCampo(1937.5, 3)).toBe('1937,5');
    });

    it('respeita a precisão de cada grandeza', () => {
        expect(textoDoCampo(0.4730361137, 4)).toBe('0,473');
        expect(textoDoCampo(0.4736361137, 4)).toBe('0,4736');
        expect(textoDoCampo(46843.0625, 3)).toBe('46843,063');
    });

    it('mantém as casas fixas quando pedido — o caso do custo do litro', () => {
        // 0,4730 × 46.843 L = R$ 22.158 de despesa; 0,47 daria R$ 142 a menos.
        // Mostrar "0,473" sugeriria que a quarta casa não existe.
        expect(textoDoCampo(0.4730361137, 4, 4)).toBe('0,4730');
        expect(textoDoCampo(0.5, 4, 4)).toBe('0,5000');
        expect(textoDoCampo(0, 4, 4)).toBe('0,0000');
    });

    it('devolve vazio para número inválido', () => {
        expect(textoDoCampo(Number.NaN)).toBe('');
        expect(textoDoCampo(Number.POSITIVE_INFINITY)).toBe('');
    });

    it('faz a volta completa: número → campo → número', () => {
        for (const valor of [0, 7392, 22158.46, 0.473, 1234.567, 241195]) {
            expect(numeroDoCampo(textoDoCampo(valor, 3))).toBeCloseTo(valor, 3);
        }
    });
});
