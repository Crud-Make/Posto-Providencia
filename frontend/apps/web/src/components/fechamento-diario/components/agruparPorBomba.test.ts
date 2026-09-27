import { describe, expect, it } from 'vitest';
import type { BicoComDetalhes } from '../../../types/fechamento';
import { agruparPorBomba } from './agruparPorBomba';

const bico = (id: number, numero: number, bombaId: number, bombaNome: string): BicoComDetalhes =>
    ({ id, numero, bomba: { id: bombaId, nome: bombaNome } }) as unknown as BicoComDetalhes;

describe('agruparPorBomba', () => {
    it('bombas pelo nome em ordem natural e bicos pelo número, sem perder nem repetir bico', () => {
        const bicos = [
            bico(1, 21, 10, 'BR BOMBA 10'),
            bico(2, 6, 2, 'BR BOMBA 02'),
            bico(3, 5, 2, 'BR BOMBA 02'),
            bico(4, 22, 10, 'BR BOMBA 10'),
            bico(5, 1, 1, 'BR BOMBA 01'),
        ];

        const grupos = agruparPorBomba(bicos);

        expect(grupos.map((g) => g.nome)).toEqual(['BR BOMBA 01', 'BR BOMBA 02', 'BR BOMBA 10']);
        expect(grupos.map((g) => g.bicos.map((b) => b.numero))).toEqual([[1], [5, 6], [21, 22]]);
        expect(grupos.flatMap((g) => g.bicos).map((b) => b.id).sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it('o layout do Jorro (bicos 1–6 em 3 bombas) fica na mesma ordem de hoje, só em blocos', () => {
        const jorro = [1, 2, 3, 4, 5, 6].map((n) => bico(n, n, Math.ceil(n / 2), `BOMBA 0${Math.ceil(n / 2)}`));

        expect(agruparPorBomba(jorro).flatMap((g) => g.bicos).map((b) => b.numero)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('sem bicos, sem grupos', () => {
        expect(agruparPorBomba([])).toEqual([]);
    });
});
