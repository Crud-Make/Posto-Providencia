/**
 * Congela a semântica do preço médio ponderado da LOJA (sítio 8 da onda 2) e
 * documenta em que ela difere da ponderada dos combustíveis — §7: divergência
 * conhecida se documenta no teste. A recomendação de domínio está no JSDoc do
 * módulo: loja é mercadoria de revenda, a consolidação da onda 3 (que mata a
 * ponderada dos tanques) NÃO a arrasta automaticamente.
 */
import { describe, it, expect } from 'vitest';
import { custoMedioPonderado } from '@posto/utils';
import { precoMedioPonderadoProduto } from './calculos-estoque-produto';

describe('precoMedioPonderadoProduto — custeio da loja/conveniência', () => {
    it('pondera estoque e entrada como a ponderada dos combustíveis (mesma conta no caso comum)', () => {
        // 100 un @ R$ 4,00 + 50 un @ R$ 5,50 → R$ 4,50
        const daLoja = precoMedioPonderadoProduto(100, 4, 50, 5.5);
        const dosTanques = custoMedioPonderado({
            estoqueAnterior: 100,
            custoMedioAnterior: 4,
            litrosCompra: 50,
            custoLitroCompra: 5.5,
        });
        expect(daLoja).toBeCloseTo(4.5, 10);
        expect(daLoja).toBeCloseTo(dosTanques, 10);
    });

    it('entrada sem valor unitário (ou ≤ 0) NÃO mexe no custo — borda que os tanques não têm', () => {
        expect(precoMedioPonderadoProduto(100, 4, 50)).toBe(4);
        expect(precoMedioPonderadoProduto(100, 4, 50, 0)).toBe(4);
        expect(precoMedioPonderadoProduto(100, 4, 50, -1)).toBe(4);
    });

    it('denominador ≤ 0 mantém o custo ANTERIOR — os tanques caem no custo da compra', () => {
        const daLoja = precoMedioPonderadoProduto(-200, 4, 100, 5.5);
        const dosTanques = custoMedioPonderado({
            estoqueAnterior: -200,
            custoMedioAnterior: 4,
            litrosCompra: 100,
            custoLitroCompra: 5.5,
        });
        expect(daLoja).toBe(4); // mantém o anterior
        expect(dosTanques).toBe(5.5); // combustível assume o da compra
    });

    it('estoque negativo entra na conta — mesma ausência de clamp dos tanques', () => {
        // −50 un @ R$ 4,00 + 100 un @ R$ 5,50 → (−200 + 550) ÷ 50 = R$ 7,00
        expect(precoMedioPonderadoProduto(-50, 4, 100, 5.5)).toBeCloseTo(7, 10);
    });
});
