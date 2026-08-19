import { describe, it, expect } from 'vitest';
import {
    litrosVendidos,
    valorDaLeitura,
    motivoImplausivel,
    MAX_LITROS_PLAUSIVEL,
} from './leitura';

describe('litrosVendidos', () => {
    it('é o salto do encerrante entre as duas leituras', () => {
        expect(litrosVendidos({ inicial: 1716778.963, fechamento: 1717451.532 }))
            .toBeCloseTo(672.569, 3);
    });

    it('vale zero quando o bico não girou', () => {
        expect(litrosVendidos({ inicial: 1000, fechamento: 1000 })).toBe(0);
    });

    /**
     * O caso que separava as duas implementações antigas: o painel gravava
     * litros negativos, o PWA gravava zero. Negativo viraria `valor_total`
     * negativo e puxaria `total_vendas` do dia para baixo em silêncio.
     */
    it('nunca é negativo, mesmo com o encerrante retrocedendo', () => {
        expect(litrosVendidos({ inicial: 1861796.633, fechamento: 1000000 })).toBe(0);
    });

    it('preserva os mililitros — o encerrante tem 3 casas', () => {
        expect(litrosVendidos({ inicial: 100.001, fechamento: 100.004 }))
            .toBeCloseTo(0.003, 6);
    });
});

describe('valorDaLeitura', () => {
    /** Linha real: 01/01, Bico 01, 672,569 L a R$ 6,28 (`encerrante_diario`). */
    it('multiplica os litros pelo preço vigente', () => {
        expect(valorDaLeitura({ inicial: 1716778.963, fechamento: 1717451.532 }, 6.28))
            .toBeCloseTo(4223.733, 2);
    });

    it('herda o piso de zero em vez de faturar negativo', () => {
        expect(valorDaLeitura({ inicial: 2000, fechamento: 1000 }, 6.28)).toBe(0);
    });

    it('é zero quando o preço ainda não foi cadastrado', () => {
        expect(valorDaLeitura({ inicial: 1000, fechamento: 1500 }, 0)).toBe(0);
    });
});

describe('motivoImplausivel', () => {
    it('não aponta nada numa leitura normal', () => {
        expect(motivoImplausivel({ inicial: 1000, fechamento: 1500 })).toBeNull();
    });

    it('aponta o encerrante que andou para trás', () => {
        expect(motivoImplausivel({ inicial: 1500, fechamento: 1000 })).toBe('retrocedeu');
    });

    it('aponta o salto acima do teto do turno', () => {
        expect(motivoImplausivel({ inicial: 0, fechamento: MAX_LITROS_PLAUSIVEL + 1 }))
            .toBe('acima-do-teto');
    });

    it('aceita o salto exatamente no teto', () => {
        expect(motivoImplausivel({ inicial: 0, fechamento: MAX_LITROS_PLAUSIVEL })).toBeNull();
    });

    /**
     * O furo que o piso de zero NÃO cobre, anotado em a7f495d: um dígito a
     * menos deixa o fechamento logo acima do inicial, o dia fecha com venda
     * quase nula e nada reclama. Fica registrado aqui como limite conhecido.
     */
    it('NÃO pega o dígito faltante que deixa o dia quase zerado', () => {
        const digitadoErrado = { inicial: 1861796.633, fechamento: 1861797.5 };
        expect(motivoImplausivel(digitadoErrado)).toBeNull();
        expect(litrosVendidos(digitadoErrado)).toBeCloseTo(0.867, 3);
    });
});
