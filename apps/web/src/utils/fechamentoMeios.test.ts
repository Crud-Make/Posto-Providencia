import { describe, it, expect } from 'vitest';
import { conferido } from '@posto/utils';
import {
    baldeDaForma,
    totaisPorBalde,
    totaisDasLinhas,
    distribuirNasFormas,
    agruparPorFrentista,
    meiosDaSessao,
} from './fechamentoMeios';
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
 * O dia 15/06/2026 **como a planilha o descreve** — a fonte de verdade.
 *
 * Conferido em `docs/data/posto_jorro_2026.sqlite`: dinheiro 4.272,68 ·
 * notas 2.242,00 · crédito 1.418,49 · débito 1.415,13 · pix 1.257,66 ·
 * baratão 675,23 · moeda 5,00 → **total R$ 11.286,19**.
 *
 * `valor_cartao` fica **zerado de propósito**. Ela é o lump que o painel web usa
 * quando se lança um total de cartão sem separar débito de crédito, e `cartao()`
 * soma os três porque são alternativos. A carga do histórico preenchia o lump com
 * `credito + debito`, repetindo o que já estava detalhado — o cartão entrava duas
 * vezes e o mês de junho fechava em R$ 360.250,06 contra R$ 284.807,47 da planilha.
 */
const DIA_15_06 = [
    sessao({
        valor_dinheiro: 'R$ 4.272,68',
        valor_pix: 'R$ 1.257,66',
        valor_cartao_credito: 'R$ 1.418,49',
        valor_cartao_debito: 'R$ 1.415,13',
        valor_cartao: '',
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
        // Débito é só o débito: o lump `valor_cartao` está zerado, porque na carga do
        // histórico ele repetia `credito + debito` e dobrava o cartão.
        expect(t.debito).toBe(1415.13);
        expect(t.nota).toBe(2242);
        expect(t.moedas).toBe(5);
        expect(t.baratao).toBe(675.23);
    });

    it('a soma dos baldes é EXATAMENTE o conferido canônico', () => {
        // Invariante: a soma dos baldes é o conferido, e o conferido é o que a
        // planilha diz — R$ 11.286,19 no 15/06 (docs/data/posto_jorro_2026.sqlite).
        const t = totaisPorBalde(DIA_15_06);
        const somaDosBaldes = Object.values(t).reduce((a, b) => a + b, 0);
        const canonico = DIA_15_06.reduce((acc, s) => acc + conferido(meiosDaSessao(s)), 0);

        expect(somaDosBaldes).toBeCloseTo(canonico, 2);
        expect(somaDosBaldes).toBeCloseTo(11286.19, 2);
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

describe('totaisDasLinhas (visão do mês)', () => {
    it('chega no mesmo total que a versão de UI, partindo de linhas numéricas do banco', () => {
        // Mesmo 15/06, só que como o Supabase devolve: número, não string BR.
        const daBase = totaisDasLinhas([
            {
                valor_dinheiro: 4272.68,
                valor_pix: 1257.66,
                valor_cartao_credito: 1418.49,
                valor_cartao_debito: 1415.13,
                valor_cartao: 0,
                valor_nota: 2242,
                valor_moedas: 5,
                baratao: 675.23,
            },
        ]);

        expect(daBase).toEqual(totaisPorBalde(DIA_15_06));
    });

    it('soma o mês inteiro, não só um dia', () => {
        const t = totaisDasLinhas([
            { valor_dinheiro: 100, valor_moedas: 2.5 },
            { valor_dinheiro: 250.5, baratao: 10 },
            { valor_pix: 33.33 },
        ]);

        expect(t.dinheiro).toBe(350.5);
        expect(t.moedas).toBe(2.5);
        expect(t.baratao).toBe(10);
        expect(t.pix).toBe(33.33);
    });

    it('mês sem nenhum fechamento devolve tudo zero', () => {
        const t = totaisDasLinhas([]);
        for (const [balde, valor] of Object.entries(t)) {
            expect(valor, `balde ${balde}`).toBe(0);
        }
    });
});

describe('agruparPorFrentista', () => {
    // Três dias, dois frentistas — o formato que a consulta do mês devolve.
    const MES = [
        { id: 1, frentista_id: 7, valor_dinheiro: 100, valor_pix: 10 },
        { id: 2, frentista_id: 9, valor_dinheiro: 200, baratao: 5 },
        { id: 3, frentista_id: 7, valor_dinheiro: 50.5, valor_nota: 30 },
        { id: 4, frentista_id: 7, valor_dinheiro: 9.5, observacoes: '[CONFERIDO] via PWA' },
    ];

    it('devolve uma linha por pessoa, não uma por dia', () => {
        // Era o bug da visão mensal: a tabela cria uma coluna por linha recebida, e
        // junho saía com 133 colunas repetindo os mesmos nomes.
        const agrupado = agruparPorFrentista(MES);

        expect(agrupado).toHaveLength(2);
        expect(agrupado.map((l) => l.frentista_id).sort()).toEqual([7, 9]);
    });

    it('soma os campos de dinheiro da pessoa', () => {
        const doSete = agruparPorFrentista(MES).find((l) => l.frentista_id === 7)!;

        expect(doSete.valor_dinheiro).toBe(160);
        expect(doSete.valor_pix).toBe(10);
        expect(doSete.valor_nota).toBe(30);
    });

    it('NÃO altera nenhum total do mês — só reagrupa', () => {
        // A garantia que autoriza agrupar: os agregados percorrem os mesmos números.
        expect(totaisDasLinhas(agruparPorFrentista(MES))).toEqual(totaisDasLinhas(MES));
    });

    it('basta um envio conferido no mês para a pessoa contar como conferida', () => {
        const doSete = agruparPorFrentista(MES).find((l) => l.frentista_id === 7)!;
        expect(doSete.observacoes).toContain('[CONFERIDO]');
    });

    it('mês vazio devolve lista vazia', () => {
        expect(agruparPorFrentista([])).toEqual([]);
    });
});

describe('distribuirNasFormas', () => {
    const FORMAS = [
        { id: 1, nome: 'Dinheiro' },
        { id: 5, nome: 'Convênio/Nota' },
        { id: 6, nome: 'Vale/Check' },
        { id: 7, nome: 'APP' },
        { id: 8, nome: 'Moedas' },
        { id: 9, nome: 'Baratão' },
    ];

    it('põe cada total na sua forma, em texto BR', () => {
        const linhas = distribuirNasFormas(FORMAS, totaisPorBalde(DIA_15_06));
        // `paraReais` sai do Intl, que separa "R$" do número com espaço RÍGIDO
        // (U+00A0). Comparar com espaço comum falha por um caractere invisível.
        const porNome = Object.fromEntries(
            linhas.map((l) => [l.nome, l.valor.replace(/\u00a0/g, ' ')])
        );

        expect(porNome['Dinheiro']).toBe('R$ 4.272,68');
        expect(porNome['Cartão de Débito'] ?? '').toBe('');
        expect(porNome['Convênio/Nota']).toBe('R$ 2.242,00');
        expect(porNome['Moedas']).toBe('R$ 5,00');
        expect(porNome['Baratão']).toBe('R$ 675,23');
    });

    it('deixa VAZIA a forma sem balde, em vez de escrever R$ 0,00', () => {
        // Vazio e zero dizem coisas diferentes: "não temos essa informação" não é
        // "não entrou nada". Vale/Check e APP não têm coluna no envio do frentista.
        const linhas = distribuirNasFormas(FORMAS, totaisPorBalde(DIA_15_06));
        const porNome = Object.fromEntries(linhas.map((l) => [l.nome, l.valor]));

        expect(porNome['Vale/Check']).toBe('');
        expect(porNome['APP']).toBe('');
    });

    it('preserva a ordem e os demais campos do cadastro', () => {
        const linhas = distribuirNasFormas(FORMAS, totaisPorBalde(DIA_15_06));

        expect(linhas.map((l) => l.nome)).toEqual(FORMAS.map((f) => f.nome));
        expect(linhas.map((l) => l.id)).toEqual(FORMAS.map((f) => f.id));
    });

    it('mês zerado não escreve zero em campo nenhum', () => {
        const linhas = distribuirNasFormas(FORMAS, totaisDasLinhas([]));
        expect(linhas.every((l) => l.valor === '')).toBe(true);
    });
});
