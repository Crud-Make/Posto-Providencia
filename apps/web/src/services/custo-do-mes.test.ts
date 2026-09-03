import { describe, it, expect } from 'vitest';
import { custoMedioPorCombustivel } from './custo-do-mes';

describe('custoMedioPorCombustivel — compra do mês, por combustível', () => {
    const compras = [
        { combustivel_id: 1, quantidade_litros: 10_000, valor_total: 53_000 },
        { combustivel_id: 1, quantidade_litros: 5_000, valor_total: 27_500 },
        { combustivel_id: 2, quantidade_litros: 8_000, valor_total: 32_800 },
        { combustivel_id: null, quantidade_litros: 1_000, valor_total: 5_000 },
    ];
    const custo = custoMedioPorCombustivel(compras);

    it('pondera pelo volume quando há mais de uma compra do produto', () => {
        // (53.000 + 27.500) ÷ 15.000
        expect(custo(1)).toBeCloseTo(5.3666667, 6);
        expect(custo(2)).toBeCloseTo(4.1, 9);
    });

    it('combustível sem compra no mês é null, nunca zero', () => {
        expect(custo(3)).toBeNull();
    });

    it('compra sem combustível não entra em lugar nenhum', () => {
        expect(custoMedioPorCombustivel([compras[3]])(1)).toBeNull();
    });
});
