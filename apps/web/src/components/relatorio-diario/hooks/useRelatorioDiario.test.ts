import { describe, it, expect } from 'vitest';
import { vendaLucroDaLeitura } from './useRelatorioDiario';

// Caso real: G,C. Bico 01 em 01/01/2026 (docs/data/posto_jorro_2026.sqlite).
// Preço do dia R$ 6,28; preço do cadastro em agosto R$ 6,98 — era o bug do
// "preço único": a tela avaliava janeiro a preço de hoje.
const leituraJaneiro = {
    turno_id: 1,
    leitura_inicial: 1716778.963,
    leitura_final: 1717451.532,
    preco_litro: 6.28,
    valor_total: 4223.73,
    bico: { combustivel: { preco_venda: 6.98, preco_custo: 5.3452 } },
};

describe('vendaLucroDaLeitura — preço do dia carimbado, nunca o do cadastro', () => {
    it('usa o valor_total gravado, não litros × preço de hoje', () => {
        const { volume, venda } = vendaLucroDaLeitura(leituraJaneiro);
        expect(volume).toBeCloseTo(672.569, 3);
        expect(venda).toBeCloseTo(4223.73, 2);
        // O valor errado que a tela mostrava antes (preço de agosto):
        expect(venda).not.toBeCloseTo(672.569 * 6.98, 2);
    });

    it('lucro usa o preço carimbado do dia contra o custo', () => {
        const { lucro } = vendaLucroDaLeitura(leituraJaneiro);
        expect(lucro).toBeCloseTo(672.569 * (6.28 - 5.3452), 2);
    });

    it('sem valor_total gravado, reconstrói com o preco_litro do dia', () => {
        const { venda } = vendaLucroDaLeitura({ ...leituraJaneiro, valor_total: null });
        expect(venda).toBeCloseTo(672.569 * 6.28, 2);
    });

    it('leitura antiga sem preço carimbado cai no cadastro (fallback)', () => {
        const { venda } = vendaLucroDaLeitura({
            ...leituraJaneiro,
            preco_litro: null,
            valor_total: null,
        });
        expect(venda).toBeCloseTo(672.569 * 6.98, 2);
    });

    it('volume nulo ou negativo zera tudo em vez de propagar lixo', () => {
        expect(
            vendaLucroDaLeitura({ ...leituraJaneiro, leitura_final: leituraJaneiro.leitura_inicial })
        ).toEqual({ volume: 0, venda: 0, lucro: 0 });
    });
});
