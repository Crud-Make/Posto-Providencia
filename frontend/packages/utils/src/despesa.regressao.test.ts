/**
 * Regressão de fórmula — `despesa.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Não substitui o golden master: o que prova que a soma bate com a planilha real
 * continua lendo `docs/data/` e rodando só na máquina do dono. Aqui o que se
 * congela é o comportamento — em especial a armadilha que o módulo existe para
 * evitar: somar a coluna inteira devolve **exatamente o dobro**, porque a linha
 * de total da planilha vem misturada às linhas de detalhe.
 *
 * Valores inventados (R$ 1.000,00 de luz, R$ 500,00 de água). Nenhum número aqui
 * vem do posto real.
 */
import { describe, it, expect } from 'vitest';
import { ehLinhaDeTotal, somarDespesas, ROTULOS_DE_TOTAL, type LinhaDespesa } from './despesa';

describe('ROTULOS_DE_TOTAL — os três rótulos reconhecidos', () => {
    it('é exatamente Total, Total. e __TOTAL__, nessa ordem', () => {
        expect(ROTULOS_DE_TOTAL).toEqual(['Total', 'Total.', '__TOTAL__']);
    });
});

describe('ehLinhaDeTotal — reconhecer a linha de total disfarçada', () => {
    it('reconhece os três rótulos como vieram', () => {
        expect(ehLinhaDeTotal('Total')).toBe(true);
        expect(ehLinhaDeTotal('Total.')).toBe(true);
        expect(ehLinhaDeTotal('__TOTAL__')).toBe(true);
    });

    it('ignora caixa e espaço nas pontas — a planilha é digitada à mão', () => {
        expect(ehLinhaDeTotal('   total.  ')).toBe(true);
        expect(ehLinhaDeTotal('TOTAL')).toBe(true);
        expect(ehLinhaDeTotal('__total__')).toBe(true);
    });

    it('categoria de verdade não é linha de total', () => {
        expect(ehLinhaDeTotal('Luz')).toBe(false);
    });

    it('NÃO casa por prefixo: "Totais" é categoria, não total', () => {
        expect(ehLinhaDeTotal('Totais')).toBe(false);
    });

    it('vazio, só-espaço, null e undefined não são linha de total', () => {
        expect(ehLinhaDeTotal('')).toBe(false);
        expect(ehLinhaDeTotal('   ')).toBe(false);
        expect(ehLinhaDeTotal(null)).toBe(false);
        expect(ehLinhaDeTotal(undefined)).toBe(false);
    });
});

describe('somarDespesas — a soma à prova da linha de total', () => {
    it('lista vazia soma 0', () => {
        expect(somarDespesas([])).toBe(0);
    });

    it('descarta a linha de total e NÃO devolve o dobro', () => {
        const linhas: LinhaDespesa[] = [
            { categoria: 'Luz', valor: 1000 },
            { categoria: 'Água', valor: 500 },
            { categoria: 'Total.', valor: 1500 },
        ];
        expect(somarDespesas(linhas)).toBe(1500);
    });

    it('descarta as três grafias de total na mesma lista', () => {
        const linhas: LinhaDespesa[] = [
            { categoria: 'Luz', valor: 1000 },
            { categoria: 'Total', valor: 1000 },
            { categoria: '__TOTAL__', valor: 1000 },
            { categoria: 'Total.', valor: 1000 },
        ];
        expect(somarDespesas(linhas)).toBe(1000);
    });

    it('lista só com a linha de total soma 0', () => {
        expect(somarDespesas([{ categoria: 'Total.', valor: 9999 }])).toBe(0);
    });

    it('célula vazia (valor null) conta como zero, não quebra a soma', () => {
        const linhas: LinhaDespesa[] = [
            { categoria: 'Luz', valor: null },
            { categoria: 'Água', valor: 500 },
        ];
        expect(somarDespesas(linhas)).toBe(500);
    });

    it('categoria null é despesa de verdade e entra na soma', () => {
        expect(somarDespesas([{ categoria: null, valor: 250 }])).toBe(250);
    });

    it('valor negativo (estorno) subtrai', () => {
        const linhas: LinhaDespesa[] = [
            { categoria: 'Luz', valor: 1000 },
            { categoria: 'Estorno', valor: -250 },
        ];
        expect(somarDespesas(linhas)).toBe(750);
    });

    it('NÃO quantiza em centavos: o drift de float sai inteiro', () => {
        // Congelado como está. `somarDespesas` é soma crua; quem quantiza é
        // quem consome o total (`emCentavos` em `lucro.ts`).
        expect(
            somarDespesas([
                { categoria: 'A', valor: 0.1 },
                { categoria: 'B', valor: 0.2 },
            ])
        ).toBe(0.30000000000000004);
    });
});
