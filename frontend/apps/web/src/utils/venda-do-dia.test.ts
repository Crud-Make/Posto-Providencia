import { describe, expect, it } from 'vitest';
import { totalVendasDoEncerrante, valorDaLeitura } from '@posto/utils';
import type { BicoComDetalhes } from '../types/fechamento';
import { vendaDoDiaPeloEncerrante } from './venda-do-dia';

/**
 * `vendaDoDiaPeloEncerrante` — a adaptação de tela sobre `totalVendasDoEncerrante` (#103 P8).
 *
 * @remarks O golden `venda-do-dia.golden.spec.ts` prova o número nos 31 dias reais de janeiro.
 *          O que ESTE arquivo trava é a nulidade e o filtro: quantos bicos contam como "lidos",
 *          e quando o dia é "não apurado" (`null`) em vez de "zero". O fixture de
 *          `useFechamento.test.ts` (1 bico, 1 leitura) nunca chega a `null` — `1 < 1` é falso —,
 *          então o caso "menos leituras que bicos" só existe aqui.
 */

/** Só os campos que o helper lê; o resto do `Bico`/`Bomba`/`Combustivel` não entra no contrato. */
function bico(id: number, precoVenda: number): BicoComDetalhes {
    return { id, combustivel: { id, preco_venda: precoVenda } } as unknown as BicoComDetalhes;
}

describe('vendaDoDiaPeloEncerrante — nulidade e filtro (I8)', () => {
    it('1 bico, 1 leitura: apurado — venda = litros × preço, pela canônica, já quantizada', () => {
        // 200 L a R$ 5,00 = R$ 1.000,00 — o mesmo dia de `useFechamento.test.ts`.
        const r = vendaDoDiaPeloEncerrante([bico(1, 5)], { 1: { inicial: '1.000,000', fechamento: '1.200,000' } });

        expect(r.totalVendas).toBe(1000);
        expect(r.totalLitros).toBe(200);
        expect(r.totalVendas).toBe(totalVendasDoEncerrante([valorDaLeitura({ inicial: 1000, fechamento: 1200 }, 5)], 1));
    });

    it('2 bicos, 1 leitura: NÃO apurado — null, nunca a venda do bico que foi lido', () => {
        const r = vendaDoDiaPeloEncerrante([bico(1, 5), bico(2, 6)], { 1: { inicial: '1.000,000', fechamento: '1.200,000' } });

        expect(r.totalVendas).toBeNull();
        // Os litros do bico lido continuam contando: a tela mostra o que já foi digitado.
        expect(r.totalLitros).toBe(200);
    });

    it('0 leituras: null, não 0', () => {
        const r = vendaDoDiaPeloEncerrante([bico(1, 5), bico(2, 6)], {});

        expect(r.totalVendas).toBeNull();
        expect(r.totalLitros).toBe(0);
    });

    it('a leitura-base (fechamento vazio) não conta como bico lido', () => {
        // O `useLeituras` semeia `{ inicial: <encerrante de ontem>, fechamento: '' }` em cada bico:
        // é o dia por preencher, não uma leitura. Com dois bicos e só a base do segundo, o dia
        // segue não apurado — o mesmo filtro de `montarDiaDeclarado.ts:65`.
        const r = vendaDoDiaPeloEncerrante(
            [bico(1, 5), bico(2, 6)],
            { 1: { inicial: '1.000,000', fechamento: '1.200,000' }, 2: { inicial: '500,000', fechamento: '' } },
        );

        expect(r.totalVendas).toBeNull();
        expect(r.totalLitros).toBe(200);
    });

    it('todos os bicos lidos com zero litro é ZERO informado, não null', () => {
        const r = vendaDoDiaPeloEncerrante(
            [bico(1, 5), bico(2, 6)],
            { 1: { inicial: '1.000,000', fechamento: '1.000,000' }, 2: { inicial: '500,000', fechamento: '500,000' } },
        );

        expect(r.totalVendas).toBe(0);
        expect(r.totalLitros).toBe(0);
    });

    it('a soma sai quantizada em centavos, e os litros em milésimos, sem resto de float', () => {
        // 0,1 + 0,2 em float é 0,30000000000000004; três parcelas de R$ 0,10 + 0,20 + 0,30 idem.
        const r = vendaDoDiaPeloEncerrante(
            [bico(1, 0.1), bico(2, 0.2), bico(3, 0.3)],
            {
                1: { inicial: '0,000', fechamento: '1,000' },
                2: { inicial: '0,000', fechamento: '1,000' },
                3: { inicial: '0,000', fechamento: '1,000' },
            },
        );

        expect(r.totalVendas).toBe(0.6);
        expect(r.totalLitros).toBe(3);
    });
});
