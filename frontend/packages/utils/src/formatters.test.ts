import { describe, it, expect } from 'vitest';
import {
    parseValue,
    formatCurrency,
    formatBR,
    formatCurrencyInput,
    analisarMoedaDigitada,
} from './formatters';

describe('formatters', () => {
    describe('parseValue', () => {
        it('should correctly parse Brazilian currency string to number', () => {
            expect(parseValue('1.234,56')).toBe(1234.56);
            expect(parseValue('R$ 1.234,56')).toBe(1234.56);
            expect(parseValue('100,00')).toBe(100);
            expect(parseValue('')).toBe(0);
        });
    });

    describe('formatCurrency', () => {
        it('should format number to BRL currency string', () => {
            // Note: Intl.NumberFormat might use non-breaking spaces
            const result = formatCurrency(1234.56).replace(/\u00a0/g, ' ');
            expect(result).toMatch(/R\$\s1\.234,56/);
        });
    });

    describe('formatBR', () => {
        it('should format number to Brazilian decimal format', () => {
            expect(formatBR(1234.56)).toBe('1.234,56');
            expect(formatBR(1234.567, 3)).toBe('1.234,567');
        });
    });

    describe('formatCurrencyInput', () => {
        it('should format digits to decimal string correctly', () => {
            expect(formatCurrencyInput('1234')).toBe('12,34');
            expect(formatCurrencyInput('123456')).toBe('1.234,56');
        });
    });

    describe('analisarMoedaDigitada', () => {
        it('lê todo dígito como centavo, preenchendo da direita', () => {
            expect(analisarMoedaDigitada('1234')).toBe(12.34);
            expect(analisarMoedaDigitada('272500')).toBe(2725);
        });

        it('chega no mesmo valor com o texto já formatado', () => {
            expect(analisarMoedaDigitada('3.100,55')).toBe(3100.55);
            expect(analisarMoedaDigitada('R$ 850,40')).toBe(850.4);
        });

        it('trata campo vazio como zero, não como NaN', () => {
            expect(analisarMoedaDigitada('')).toBe(0);
            expect(analisarMoedaDigitada('R$ ')).toBe(0);
        });

        it('não é intercambiável com parseValue: um lê tecla, o outro lê valor pronto', () => {
            // Mesma string, respostas legitimamente diferentes: "7436" digitado num
            // campo de moeda é R$ 74,36; "7436" já formatado na tela é R$ 7.436,00.
            // Trocar um pelo outro é como o valor sai 100× errado.
            expect(analisarMoedaDigitada('7436')).toBe(74.36);
            expect(parseValue('7436')).toBe(7436);
        });
    });
});
