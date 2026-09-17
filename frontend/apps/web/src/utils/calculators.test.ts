import { describe, it, expect } from 'vitest';
import { litrosVendidos, valorDaLeitura } from '@posto/utils';
import { calcularLitros, calcularVenda } from './calculators';

/**
 * [onda 3, 3.8] `calculators.ts` passou a delegar a aritmética do encerrante a
 * `@posto/utils/leitura`. Estes testes travam a equivalência: o adapter de tela
 * (parse BR + regra do "-") não pode divergir da fórmula canônica.
 */
describe('calculators — adapter de tela sobre @posto/utils/leitura', () => {
    it('calcularLitros = litrosVendidos canônico sobre o parse BR', () => {
        const r = calcularLitros('1.000,500', '1.500,750');
        expect(r.valor).toBe(litrosVendidos({ inicial: 1000.5, fechamento: 1500.75 }));
        expect(r.valor).toBeCloseTo(500.25, 9);
        expect(r.exibicao).toBe('500,250');
    });

    it('fechamento ≤ inicial mostra "-" e vale 0 (mesma regra do piso canônico)', () => {
        expect(calcularLitros('1.500,000', '1.000,000')).toEqual({ valor: 0, exibicao: '-' });
        expect(calcularLitros('1.000', '1.000')).toEqual({ valor: 0, exibicao: '-' });
        expect(litrosVendidos({ inicial: 1500, fechamento: 1000 })).toBe(0);
    });

    it('calcularVenda = valorDaLeitura canônico (litros × preço)', () => {
        const r = calcularVenda(100, 5.5);
        expect(r.valor).toBe(valorDaLeitura({ inicial: 0, fechamento: 100 }, 5.5));
        expect(r.valor).toBe(550);
        expect(calcularVenda(0, 5.5)).toEqual({ valor: 0, exibicao: '-' });
    });
});
