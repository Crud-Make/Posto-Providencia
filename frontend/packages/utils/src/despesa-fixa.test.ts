import { describe, it, expect } from 'vitest';
import {
    chaveDescricao,
    molde,
    fixasPendentes,
    totalSugerido,
    type DespesaRecorrente,
} from './despesa-fixa';

/**
 * Recorte real dos 7 meses de 2026 carregados em 02/08. Os valores são os que
 * estão em produção — inclusive os reajustes, que são o motivo de o módulo
 * existir: "fixa" é recorrente, não valor constante.
 */
const SALARIO_PAULO: DespesaRecorrente[] = [
    { descricao: 'Paulo = 20', categoria: 'Folha de Pagamento', valor: 2100, data: '2026-01-31' },
    { descricao: 'Paulo = 20', categoria: 'Folha de Pagamento', valor: 2100, data: '2026-03-31' },
    { descricao: 'Paulo = 20', categoria: 'Folha de Pagamento', valor: 2200, data: '2026-06-30' },
];

const LUZ: DespesaRecorrente[] = [
    { descricao: 'Luz', categoria: 'Energia Elétrica', valor: 650, data: '2026-01-31' },
    { descricao: 'Luz', categoria: 'Energia Elétrica', valor: 850, data: '2026-06-30' },
    { descricao: 'Luz', categoria: 'Energia Elétrica', valor: 280, data: '2026-07-31' },
];

describe('chaveDescricao', () => {
    it('trata grafias da planilha como a mesma despesa', () => {
        // A planilha é digitada à mão: o ponto final vai e volta entre meses.
        expect(chaveDescricao('Sistema.')).toBe(chaveDescricao('Sistema'));
        expect(chaveDescricao('  Luz  ')).toBe(chaveDescricao('Luz'));
        expect(chaveDescricao('CONTADOR')).toBe(chaveDescricao('Contador'));
        expect(chaveDescricao('Paulo  =  20')).toBe(chaveDescricao('Paulo = 20'));
    });

    it('NÃO funde nomes que o dono escreve diferente de propósito', () => {
        // "= 20" e "= 10" são dias de pagamento distintos, não erro de digitação.
        expect(chaveDescricao('Paulo = 20')).not.toBe(chaveDescricao('Paulo = 10'));
        expect(chaveDescricao('Nayla = 20')).not.toBe(chaveDescricao('Leandro = 10'));
    });
});

describe('molde', () => {
    it('sugere o valor do lançamento MAIS RECENTE, acompanhando o reajuste', () => {
        const [paulo] = molde(SALARIO_PAULO);
        expect(paulo.valor).toBe(2200);
        expect(paulo.data).toBe('2026-06-30');
    });

    it('não depende da ordem de entrada', () => {
        const invertido = [...SALARIO_PAULO].reverse();
        expect(molde(invertido)[0].valor).toBe(2200);
    });

    it('devolve uma linha por despesa, em ordem alfabética', () => {
        const r = molde([...SALARIO_PAULO, ...LUZ]);
        expect(r).toHaveLength(2);
        expect(r.map((d) => d.descricao)).toEqual(['Luz', 'Paulo = 20']);
    });
});

describe('fixasPendentes', () => {
    it('lista o que falta no mês, com o valor mais recente como sugestão', () => {
        const p = fixasPendentes([...SALARIO_PAULO, ...LUZ], [], '2026-08');

        expect(p.map((x) => x.descricao)).toEqual(['Luz', 'Paulo = 20']);
        expect(p.find((x) => x.descricao === 'Luz')!.valorSugerido).toBe(280);
        expect(p.find((x) => x.descricao === 'Paulo = 20')!.valorSugerido).toBe(2200);
    });

    it('não repete o que já foi lançado no mês', () => {
        const p = fixasPendentes([...SALARIO_PAULO, ...LUZ], ['Luz'], '2026-08');
        expect(p.map((x) => x.descricao)).toEqual(['Paulo = 20']);
    });

    it('reconhece o já-lançado mesmo com grafia diferente', () => {
        // O dono lançou "sistema" e o molde tem "Sistema." — é a mesma conta,
        // e lançar de novo dobraria a despesa do mês.
        const sistema: DespesaRecorrente[] = [
            { descricao: 'Sistema.', categoria: 'Outros', valor: 200, data: '2026-01-31' },
        ];
        expect(fixasPendentes(sistema, ['  sistema  '], '2026-08')).toHaveLength(0);
    });

    it('devolve vazio quando o mês já está completo', () => {
        const p = fixasPendentes([...SALARIO_PAULO, ...LUZ], ['Luz', 'Paulo = 20'], '2026-08');
        expect(p).toEqual([]);
    });

    /**
     * REGRESSÃO: relançar um mês fechado não pode sugerir o valor dele mesmo.
     * Sem o corte por data, pedir as pendentes de julho ofereceria os R$ 280 do
     * próprio julho como se fossem do mês anterior, e o número perderia sentido.
     */
    it('ignora molde do próprio mês alvo ou posterior', () => {
        const p = fixasPendentes(LUZ, [], '2026-07');
        // Só jan e jun são anteriores a julho; o mais recente deles é junho.
        expect(p[0].valorSugerido).toBe(850);
        expect(p[0].referencia).toBe('2026-06');
    });

    it('devolve vazio quando não há molde anterior ao mês', () => {
        expect(fixasPendentes(LUZ, [], '2026-01')).toEqual([]);
    });

    it('informa de que mês veio a sugestão', () => {
        const p = fixasPendentes(SALARIO_PAULO, [], '2026-08');
        expect(p[0].referencia).toBe('2026-06');
    });

    /**
     * Proteção, não regressão. Não houve bug observado: o campo do formulário
     * carrega o valor certo. O que este teste trava é a sujeira de float chegar
     * de outro caminho — uma soma ou média a montante devolvendo
     * 4315.7600000000002 — e ir para o INSERT como está. Um centavo de sujeira
     * gravado não se desfaz.
     */
    it('quantiza a sugestão em centavos, venha o float como vier', () => {
        const sujos: DespesaRecorrente[] = [
            { descricao: 'Contador', categoria: 'Contabilidade', valor: 4315.7600000000002, data: '2026-07-31' },
            { descricao: 'Luz', categoria: 'Energia Elétrica', valor: 0.1 + 0.2, data: '2026-07-31' },
        ];
        const p = fixasPendentes(sujos, [], '2026-08');

        expect(p.find((x) => x.descricao === 'Contador')!.valorSugerido).toBe(4315.76);
        // 0.1 + 0.2 === 0.30000000000000004 em float64.
        expect(p.find((x) => x.descricao === 'Luz')!.valorSugerido).toBe(0.3);
    });
});

describe('totalSugerido', () => {
    it('soma o que entraria, quantizado em centavos', () => {
        const p = fixasPendentes([...SALARIO_PAULO, ...LUZ], [], '2026-08');
        expect(totalSugerido(p)).toBe(2480);
    });

    it('não acumula erro de float', () => {
        const centavos: DespesaRecorrente[] = [
            { descricao: 'A', categoria: null, valor: 0.1, data: '2026-01-31' },
            { descricao: 'B', categoria: null, valor: 0.2, data: '2026-01-31' },
        ];
        expect(totalSugerido(fixasPendentes(centavos, [], '2026-08'))).toBe(0.3);
    });

    it('devolve zero para lista vazia', () => {
        expect(totalSugerido([])).toBe(0);
    });
});
