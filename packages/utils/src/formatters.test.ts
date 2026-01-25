import { describe, it, expect } from 'vitest';
import { parseValue, formatCurrency, formatBR, formatCurrencyInput } from './formatters';

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
});
