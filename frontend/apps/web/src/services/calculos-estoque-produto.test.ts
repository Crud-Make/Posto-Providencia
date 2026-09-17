/**
 * Congela a semântica do preço médio ponderado da LOJA (sítio 8 da onda 2).
 * Loja é mercadoria de revenda: a ponderada faz sentido aqui. A dos TANQUES
 * (`custoMedioPonderado`) foi apagada em 06/09/2026 — combustível custeia pela
 * compra do mês (`custoMedioCompra`); este módulo não a seguiu de propósito.
 */
import { describe, it, expect } from 'vitest';
import { precoMedioPonderadoProduto } from './calculos-estoque-produto';

describe('precoMedioPonderadoProduto — custeio da loja/conveniência', () => {
    it('pondera estoque e entrada pelo valor', () => {
        // 100 un @ R$ 4,00 + 50 un @ R$ 5,50 → R$ 4,50
        expect(precoMedioPonderadoProduto(100, 4, 50, 5.5)).toBeCloseTo(4.5, 10);
    });

    it('entrada sem valor unitário (ou ≤ 0) NÃO mexe no custo', () => {
        expect(precoMedioPonderadoProduto(100, 4, 50)).toBe(4);
        expect(precoMedioPonderadoProduto(100, 4, 50, 0)).toBe(4);
        expect(precoMedioPonderadoProduto(100, 4, 50, -1)).toBe(4);
    });

    it('denominador ≤ 0 mantém o custo ANTERIOR', () => {
        expect(precoMedioPonderadoProduto(-200, 4, 100, 5.5)).toBe(4);
    });

    it('estoque negativo entra na conta — sem clamp em zero', () => {
        // −50 un @ R$ 4,00 + 100 un @ R$ 5,50 → (−200 + 550) ÷ 50 = R$ 7,00
        expect(precoMedioPonderadoProduto(-50, 4, 100, 5.5)).toBeCloseTo(7, 10);
    });
});
