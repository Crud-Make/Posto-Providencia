/**
 * Congela a semântica de PRODUÇÃO da média ponderada — inclusive as bordas em
 * que a réplica antiga do golden fazia OUTRA conta (§7: divergência conhecida
 * se documenta no teste, não se conserta calada).
 */
import { describe, it, expect } from 'vitest';
import { custoMedioPonderado } from './custo-ponderado';
import { custoMedioCompra } from './lucro';

describe('custoMedioPonderado — a fórmula legada do caminho de escrita', () => {
    it('pondera o estoque anterior com a compra', () => {
        // 1.000 L @ R$ 5,00 no tanque + 1.000 L comprados @ R$ 6,00 → R$ 5,50
        expect(
            custoMedioPonderado({
                estoqueAnterior: 1000,
                custoMedioAnterior: 5,
                litrosCompra: 1000,
                custoLitroCompra: 6,
            })
        ).toBeCloseTo(5.5, 10);
    });

    it('com tanque zerado, o custo é o da própria compra — único caso em que empata com o canônico', () => {
        const ponderado = custoMedioPonderado({
            estoqueAnterior: 0,
            custoMedioAnterior: 5,
            litrosCompra: 1000,
            custoLitroCompra: 6,
        });
        const canonico = custoMedioCompra([{ litros: 1000, valorTotal: 6000 }]);
        expect(ponderado).toBeCloseTo(6, 10);
        expect(ponderado).toBeCloseTo(canonico!, 10);
    });

    it('BORDA: estoque NEGATIVO entra na conta — produção não tem clamp em zero', () => {
        // −500 L @ R$ 5,00 + 1.000 L @ R$ 6,00 → (−2.500 + 6.000) ÷ 500 = R$ 7,00/L:
        // custo MAIOR que qualquer preço já pago. É o comportamento real de
        // `compra.service.ts` desde 0ef4587; a réplica antiga do golden fazia
        // `Math.max(estoque, 0)` e daria R$ 6,00 — a cópia e o original nunca
        // foram a mesma conta. Documentado aqui, decisão de troca é da onda 3.9.
        expect(
            custoMedioPonderado({
                estoqueAnterior: -500,
                custoMedioAnterior: 5,
                litrosCompra: 1000,
                custoLitroCompra: 6,
            })
        ).toBeCloseTo(7, 10);
    });

    it('BORDA: denominador ≤ 0 devolve o custo da compra ATUAL — a réplica devolvia o anterior', () => {
        expect(
            custoMedioPonderado({
                estoqueAnterior: -2000,
                custoMedioAnterior: 5,
                litrosCompra: 1000,
                custoLitroCompra: 6,
            })
        ).toBe(6);
    });

    it('divergência estrutural vs canônico: o estoque anterior muda o custo do mês', () => {
        // Mesma compra do mês; o canônico ignora o tanque, a ponderada não.
        const canonico = custoMedioCompra([{ litros: 1000, valorTotal: 6000 }]);
        const ponderado = custoMedioPonderado({
            estoqueAnterior: 3000,
            custoMedioAnterior: 5,
            litrosCompra: 1000,
            custoLitroCompra: 6,
        });
        expect(canonico).toBeCloseTo(6, 10);
        expect(ponderado).toBeCloseTo(5.25, 10);
    });
});
