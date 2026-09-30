import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LinhaProduto, TotaisMes } from '@posto/utils';
import { CentroDoMes } from './centro-do-mes';

/**
 * Reensaio Jorro+BR (30/09/2026): GC 50 L e ET 30 L são 62,5 % e 37,5 % dos litros; arredondando cada fatia
 * para inteiro, a legenda mostrava 63 % + 38 % = 101 %. A conta não mudou — só a exibição ganhou uma casa.
 */
const linha = (produto: string, litros: number, participacaoLitros: number): LinhaProduto => ({
    produto, bicos: [], litros, venda: 0, lucro: 0, margem: 0, precoMedio: null, participacaoLitros, apurado: false,
} as LinhaProduto);

const totais = { litros: 80, venda: 491.2, lucro: 0, margem: 0, precoMedio: null, despesaPorLitro: 0 } as TotaisMes;

describe('CentroDoMes — participação dos litros', () => {
    it('mostra 62,5 % e 37,5 % (somam 100), não 63 % e 38 %', () => {
        const html = renderToStaticMarkup(
            <CentroDoMes
                totais={totais}
                produtos={[linha('Gasolina Comum', 50, 62.5), linha('Etanol', 30, 37.5)]}
                codigoDoProduto={() => null}
                despesaDoMes={0}
                temDespesa={false}
                apurado={false}
            />,
        );
        expect(html).toContain('62,5%');
        expect(html).toContain('37,5%');
        expect(html).not.toContain('63%');
        expect(html).not.toContain('38%');
    });
});
