/**
 * Regressão de fórmula — `leitura.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Esta suíte NÃO prova correção contra a planilha do posto: isso continua sendo
 * trabalho do golden master (`leitura.golden.spec.ts`), que lê `docs/data/` e por
 * isso só roda na máquina do dono.
 *
 * O que ela prova é o que falta no CI: que a aritmética do encerrante NÃO MUDOU.
 * Entradas inventadas (encerrante 10.000 → 11.000, R$ 6,00/L), saídas congeladas
 * em literais escritos à mão a partir da execução real das funções. Se um número
 * aqui mudar, alguém mexeu na conta que alimenta `total_vendas` e daí a
 * `diferenca` — e o golden local é quem decide se a mudança é conserto ou
 * regressão.
 *
 * Nenhum valor abaixo vem do posto real.
 */
import { describe, it, expect } from 'vitest';
import {
    litrosVendidos,
    valorDaLeitura,
    motivoImplausivel,
    MAX_LITROS_PLAUSIVEL,
} from './leitura';

describe('MAX_LITROS_PLAUSIVEL — o teto de volume', () => {
    it('é 3000 litros por turno', () => {
        expect(MAX_LITROS_PLAUSIVEL).toBe(3000);
    });
});

describe('litrosVendidos — o salto do encerrante', () => {
    it('devolve a diferença entre os dois encerrantes', () => {
        expect(litrosVendidos({ inicial: 10000, fechamento: 11000 })).toBe(1000);
    });

    it('encerrante que retrocede vira 0, nunca litro negativo', () => {
        // Bomba não anda para trás: o piso evita que o negativo desça para
        // `total_vendas` do dia inteiro.
        expect(litrosVendidos({ inicial: 11000, fechamento: 10000 })).toBe(0);
    });

    it('encerrante parado devolve 0', () => {
        expect(litrosVendidos({ inicial: 10000, fechamento: 10000 })).toBe(0);
    });

    it('NÃO quantiza: a subtração de float sai com o ruído inteiro', () => {
        // Congelado como está. Quem arredonda ao mililitro é `planilha-mensal`,
        // não este módulo — trocar isso de lugar move o estoque teórico.
        expect(litrosVendidos({ inicial: 10000.005, fechamento: 10500.105 })).toBe(
            500.10000000000036
        );
    });

    it('salto de 3 casas decimais sai exato quando o float colabora', () => {
        expect(litrosVendidos({ inicial: 1000.125, fechamento: 2000.875 })).toBe(1000.75);
    });
});

describe('valorDaLeitura — faturamento bruto ao preço vigente', () => {
    it('1000 L a R$ 6,00 dão R$ 6.000,00', () => {
        expect(valorDaLeitura({ inicial: 10000, fechamento: 11000 }, 6)).toBe(6000);
    });

    it('leitura invertida fatura 0, porque os litros já vieram zerados', () => {
        expect(valorDaLeitura({ inicial: 11000, fechamento: 10000 }, 6)).toBe(0);
    });

    it('preço 0 zera o faturamento sem zerar os litros', () => {
        expect(valorDaLeitura({ inicial: 10000, fechamento: 11000 }, 0)).toBe(0);
        expect(litrosVendidos({ inicial: 10000, fechamento: 11000 })).toBe(1000);
    });

    it('NÃO quantiza em centavos: o terceiro decimal sobrevive', () => {
        // 100,5 L × R$ 6,25 = R$ 628,125. Quem quantiza é quem consome.
        expect(valorDaLeitura({ inicial: 0, fechamento: 100.5 }, 6.25)).toBe(628.125);
    });
});

describe('motivoImplausivel — o aviso que o piso de zero não dá', () => {
    it('leitura normal não tem o que apontar', () => {
        expect(motivoImplausivel({ inicial: 10000, fechamento: 11000 })).toBe(null);
    });

    it('encerrante parado também não é suspeito', () => {
        expect(motivoImplausivel({ inicial: 10000, fechamento: 10000 })).toBe(null);
    });

    it('encerrante para trás é "retrocedeu"', () => {
        expect(motivoImplausivel({ inicial: 11000, fechamento: 10000 })).toBe('retrocedeu');
    });

    it('3000 L cravados ainda são plausíveis — o teto é exclusivo', () => {
        expect(motivoImplausivel({ inicial: 10000, fechamento: 13000 })).toBe(null);
    });

    it('um mililitro acima do teto já é "acima-do-teto"', () => {
        expect(motivoImplausivel({ inicial: 10000, fechamento: 13000.001 })).toBe(
            'acima-do-teto'
        );
    });

    it('salto grosseiro é "acima-do-teto"', () => {
        expect(motivoImplausivel({ inicial: 0, fechamento: 10000 })).toBe('acima-do-teto');
    });

    it('retrocesso tem precedência sobre o teto quando os dois poderiam valer', () => {
        // Fechamento muito abaixo do inicial: o primeiro `if` decide.
        expect(motivoImplausivel({ inicial: 50000, fechamento: 10000 })).toBe('retrocedeu');
    });
});
