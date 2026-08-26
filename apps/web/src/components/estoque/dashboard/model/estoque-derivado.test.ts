import { describe, it, expect } from 'vitest';
import { estoqueAtualDerivado } from './estoque-derivado';

const TANQUES = [
    { id: 1, combustivelId: 10 },
    { id: 2, combustivelId: 20 },
];

describe('estoqueAtualDerivado', () => {
    it('régua + compras − vendas, só o que veio depois da régua', () => {
        const estoque = estoqueAtualDerivado(
            TANQUES,
            [{ tanqueId: 1, data: '2025-12-31', litros: 7392 }],
            [
                { combustivelId: 10, data: '2026-01-05T00:00:00+00:00', litros: 31000 },
                { combustivelId: 10, data: '2025-12-20T00:00:00+00:00', litros: 5000 }, // antes da régua: fora
            ],
            [
                { combustivelId: 10, data: '2026-01-01T00:00:00+00:00', litros: 1000.5 },
                { combustivelId: 10, data: '2026-01-02T00:00:00+00:00', litros: 2000.25 },
            ]
        );

        expect(estoque.get(1)).toBeCloseTo(7392 + 31000 - 3000.75, 3);
    });

    it('venda no MESMO dia da régua não conta — a régua já a viu', () => {
        const estoque = estoqueAtualDerivado(
            TANQUES,
            [{ tanqueId: 1, data: '2026-01-10', litros: 5000 }],
            [],
            [{ combustivelId: 10, data: '2026-01-10T00:00:00+00:00', litros: 800 }]
        );

        expect(estoque.get(1)).toBe(5000);
    });

    it('usa a régua mais recente, não a primeira da lista', () => {
        const estoque = estoqueAtualDerivado(
            TANQUES,
            [
                { tanqueId: 1, data: '2026-01-31', litros: 5672 },
                { tanqueId: 1, data: '2025-12-31', litros: 7392 },
            ],
            [],
            [
                { combustivelId: 10, data: '2026-01-15T00:00:00+00:00', litros: 10000 }, // antes da régua nova
                { combustivelId: 10, data: '2026-02-01T00:00:00+00:00', litros: 100 },
            ]
        );

        expect(estoque.get(1)).toBe(5572);
    });

    it('tanque nunca medido devolve null, nunca 0', () => {
        const estoque = estoqueAtualDerivado(
            TANQUES,
            [{ tanqueId: 1, data: '2025-12-31', litros: 7392 }],
            [],
            [{ combustivelId: 20, data: '2026-01-01T00:00:00+00:00', litros: 500 }]
        );

        expect(estoque.get(2)).toBeNull();
    });

    it('movimento de outro combustível não entra na conta', () => {
        const estoque = estoqueAtualDerivado(
            TANQUES,
            [
                { tanqueId: 1, data: '2025-12-31', litros: 1000 },
                { tanqueId: 2, data: '2025-12-31', litros: 2000 },
            ],
            [{ combustivelId: 20, data: '2026-01-01T00:00:00+00:00', litros: 300 }],
            [{ combustivelId: 10, data: '2026-01-01T00:00:00+00:00', litros: 100 }]
        );

        expect(estoque.get(1)).toBe(900);
        expect(estoque.get(2)).toBe(2300);
    });

    it('não converte data para horário local (não escorrega um dia)', () => {
        // 02:00 UTC de 01/01 é 23:00 de 31/12 em GMT-3. Um `new Date()` local
        // jogaria a venda para o dia da régua e ela sumiria da conta.
        const estoque = estoqueAtualDerivado(
            TANQUES,
            [{ tanqueId: 1, data: '2025-12-31', litros: 1000 }],
            [],
            [{ combustivelId: 10, data: '2026-01-01T02:00:00+00:00', litros: 100 }]
        );

        expect(estoque.get(1)).toBe(900);
    });
});
