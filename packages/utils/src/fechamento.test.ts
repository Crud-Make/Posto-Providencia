import { describe, it, expect } from 'vitest';
import {
    cartao,
    conferido,
    diferenca,
    isFalta,
    isSobra,
    breakdown,
    meiosFromFechamentoRow,
    meiosFromPwaPayments,
    type MeiosPagamento,
} from './fechamento';

/** Sessão vinda do PWA: cartão dividido em débito/crédito, valor_cartao = 0, com moedas. */
const linhaPwa = {
    valor_dinheiro: 100,
    valor_moedas: 5,
    valor_pix: 50,
    valor_cartao: 0,
    valor_cartao_debito: 30,
    valor_cartao_credito: 20,
    valor_nota: 10,
    baratao: 15,
};

/** Sessão lançada no dashboard web: cartão como lump em valor_cartao, sem moedas. */
const sessaoWeb = {
    valor_dinheiro: 100,
    valor_pix: 50,
    valor_cartao: 50, // débito + crédito num campo só
    valor_cartao_debito: 0,
    valor_cartao_credito: 0,
    valor_nota: 10,
    valor_baratao: 15, // nome do campo na UI
};

describe('cartao (aditivo)', () => {
    it('soma débito + crédito quando origem é PWA (legado 0)', () => {
        expect(cartao(meiosFromFechamentoRow(linhaPwa))).toBe(50);
    });

    it('usa o lump valor_cartao quando origem é web (débito/crédito 0)', () => {
        expect(cartao(meiosFromFechamentoRow(sessaoWeb))).toBe(50);
    });

    it('soma os três se coexistirem (aditivo, sem fallback)', () => {
        const m: MeiosPagamento = {
            dinheiro: 0, moedas: 0, pix: 0,
            cartaoLegado: 10, cartaoDebito: 30, cartaoCredito: 20,
            nota: 0, baratao: 0,
        };
        expect(cartao(m)).toBe(60);
    });
});

describe('conferido (7 buckets)', () => {
    it('inclui moedas e baratão (linha PWA)', () => {
        // 100 + 5 + 50 + (0+30+20) + 10 + 15 = 230
        expect(conferido(meiosFromFechamentoRow(linhaPwa))).toBe(230);
    });

    it('trata moedas ausente como 0 (sessão web sem moedas)', () => {
        // 100 + 0 + 50 + 50 + 10 + 15 = 225
        expect(conferido(meiosFromFechamentoRow(sessaoWeb))).toBe(225);
    });

    it('trata null/undefined como 0', () => {
        expect(conferido(meiosFromFechamentoRow({ valor_dinheiro: 100, valor_moedas: null, baratao: null }))).toBe(100);
    });
});

describe('diferenca (encerrante − conferido)', () => {
    it('positivo = FALTA (vendeu mais do que declarou)', () => {
        const d = diferenca(250, conferido(meiosFromFechamentoRow(linhaPwa))); // 250 - 230 = 20
        expect(d).toBe(20);
        expect(isFalta(d)).toBe(true);
        expect(isSobra(d)).toBe(false);
    });

    it('negativo = SOBRA (declarou mais do que vendeu)', () => {
        const d = diferenca(200, conferido(meiosFromFechamentoRow(linhaPwa))); // 200 - 230 = -30
        expect(d).toBe(-30);
        expect(isSobra(d)).toBe(true);
        expect(isFalta(d)).toBe(false);
    });

    it('zero = caixa batido', () => {
        const d = diferenca(230, conferido(meiosFromFechamentoRow(linhaPwa)));
        expect(d).toBe(0);
        expect(isFalta(d)).toBe(false);
        expect(isSobra(d)).toBe(false);
    });
});

describe('breakdown', () => {
    it('quebra por meio e o total bate com conferido', () => {
        const m = meiosFromFechamentoRow(linhaPwa);
        const b = breakdown(m);
        expect(b).toEqual({
            dinheiro: 100, moedas: 5, pix: 50, cartao: 50, nota: 10, baratao: 15, total: 230,
        });
        expect(b.total).toBe(conferido(m));
    });
});

describe('meiosFromPwaPayments (centavos → reais)', () => {
    it('converte strings mascaradas em centavos e soma os 7 buckets', () => {
        const m = meiosFromPwaPayments({
            dinheiro: 'R$ 100,00', // 10000 centavos
            moedas: '500',         // 5,00
            pix: '5000',           // 50,00
            debito: '3000',        // 30,00
            credito: '2000',       // 20,00
            notaPrazo: '1000',     // 10,00
            baratao: '1500',       // 15,00
        });
        expect(m.cartaoLegado).toBe(0);
        expect(cartao(m)).toBe(50);
        expect(conferido(m)).toBe(230);
    });

    it('campos vazios viram 0', () => {
        const m = meiosFromPwaPayments({
            dinheiro: '', moedas: '', pix: '', debito: '', credito: '', notaPrazo: '', baratao: '',
        });
        expect(conferido(m)).toBe(0);
    });
});
