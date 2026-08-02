import { describe, it, expect } from 'vitest';
import { conferido } from '@posto/utils';
import { baldeDaForma, totaisPorBalde, meiosDaSessao } from './fechamentoMeios';
import type { SessaoFrentista } from '../types/fechamento';

/**
 * Sessão mínima com os valores já no formato que a UI guarda ("R$ 1.234,56").
 * Só os campos de dinheiro importam aqui.
 */
const sessao = (v: Partial<SessaoFrentista>): SessaoFrentista =>
    ({
        tempId: 'x',
        frentista_id: 1,
        valor_dinheiro: '',
        valor_moedas: '',
        valor_pix: '',
        valor_cartao: '',
        valor_cartao_debito: '',
        valor_cartao_credito: '',
        valor_nota: '',
        valor_baratao: '',
        ...v,
    }) as SessaoFrentista;

/**
 * O dia 15/06/2026 como está em produção, somado das 4 sessões.
 * Conferido pelo banco: dinheiro 4.272,68 · pix 1.257,66 · crédito 1.418,49 ·
 * débito 1.415,13 + cartão legado 2.833,62 · nota 2.242,00 · moedas 5,00 ·
 * baratão 675,23 → total R$ 14.119,81.
 */
const DIA_15_06 = [
    sessao({
        valor_dinheiro: 'R$ 4.272,68',
        valor_pix: 'R$ 1.257,66',
        valor_cartao_credito: 'R$ 1.418,49',
        valor_cartao_debito: 'R$ 1.415,13',
        valor_cartao: 'R$ 2.833,62',
        valor_nota: 'R$ 2.242,00',
        valor_moedas: 'R$ 5,00',
        valor_baratao: 'R$ 675,23',
    }),
];

describe('baldeDaForma', () => {
    it('mapeia cada forma cadastrada ao seu balde canônico', () => {
        expect(baldeDaForma('Dinheiro')).toBe('dinheiro');
        expect(baldeDaForma('Pix')).toBe('pix');
        expect(baldeDaForma('Cartão de Crédito')).toBe('credito');
        expect(baldeDaForma('Cartão de Débito')).toBe('debito');
        expect(baldeDaForma('Convênio/Nota')).toBe('nota');
        expect(baldeDaForma('Moedas')).toBe('moedas');
        expect(baldeDaForma('Baratão')).toBe('baratao');
    });

    it('NÃO manda Vale/Check para a nota', () => {
        // Era o bug: o teste antigo era `nome.includes('vale')` dentro do mesmo ramo
        // do `nota`, e "Vale/Check" contém "vale". A nota entrava DUAS vezes no
        // Caixa Geral — R$ 2.242,00 a mais no dia 15/06.
        expect(baldeDaForma('Vale/Check')).toBeNull();
    });

    it('devolve null para forma sem coluna de origem, em vez de chutar', () => {
        expect(baldeDaForma('APP')).toBeNull();
        expect(baldeDaForma('Qualquer coisa nova')).toBeNull();
    });

    it('ignora acento, caixa e espaço de borda do cadastro', () => {
        expect(baldeDaForma('  BARATAO ')).toBe('baratao');
        expect(baldeDaForma('cartao de credito')).toBe('credito');
        expect(baldeDaForma('Moeda')).toBe('moedas');
    });
});

describe('totaisPorBalde', () => {
    it('reproduz o 15/06 balde a balde', () => {
        const t = totaisPorBalde(DIA_15_06);

        expect(t.dinheiro).toBe(4272.68);
        expect(t.pix).toBe(1257.66);
        expect(t.credito).toBe(1418.49);
        // Débito absorve o cartão legado (regra aditiva de `cartao()`): 1.415,13 + 2.833,62
        expect(t.debito).toBe(4248.75);
        expect(t.nota).toBe(2242);
        expect(t.moedas).toBe(5);
        expect(t.baratao).toBe(675.23);
    });

    it('a soma dos baldes é EXATAMENTE o conferido canônico', () => {
        // Esta é a invariante que o bug violava: o Caixa Geral auto-preenchido
        // devolvia R$ 15.681,58 onde o conferido é R$ 14.119,81 — R$ 2.242,00 de
        // nota duplicada menos R$ 680,23 de moedas + baratão que sumiam.
        const t = totaisPorBalde(DIA_15_06);
        const somaDosBaldes = Object.values(t).reduce((a, b) => a + b, 0);
        const canonico = DIA_15_06.reduce((acc, s) => acc + conferido(meiosDaSessao(s)), 0);

        expect(somaDosBaldes).toBeCloseTo(canonico, 2);
        expect(somaDosBaldes).toBeCloseTo(14119.81, 2);
    });

    it('soma várias sessões do mesmo dia', () => {
        const t = totaisPorBalde([
            sessao({ valor_dinheiro: 'R$ 100,00', valor_baratao: 'R$ 10,00' }),
            sessao({ valor_dinheiro: 'R$ 250,50', valor_moedas: 'R$ 1,50' }),
        ]);

        expect(t.dinheiro).toBe(350.5);
        expect(t.baratao).toBe(10);
        expect(t.moedas).toBe(1.5);
    });

    it('dia sem movimento devolve zero em todo balde, não NaN', () => {
        const t = totaisPorBalde([sessao({})]);
        for (const [balde, valor] of Object.entries(t)) {
            expect(valor, `balde ${balde}`).toBe(0);
        }
    });
});
