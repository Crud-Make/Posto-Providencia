/**
 * Regressão de fórmula — `despesa-fixa.ts`, com dados SINTÉTICOS.
 *
 * @remarks
 * Não substitui golden master nenhum: aqui só se congela o comportamento atual,
 * com entradas inventadas (aluguel R$ 1.000,00, internet R$ 200,00, ano 2000).
 * Nenhuma descrição, valor ou data abaixo vem do posto real.
 *
 * Dois pontos travados de propósito porque são fáceis de "consertar" sem querer:
 *
 * 1. `valorSugerido` e `totalSugerido` quantizam com `Math.round(x * 100) / 100`
 *    escrito à mão no próprio módulo, em vez de chamar o `emCentavos` de
 *    `lucro.ts`. É duplicação conhecida — esta suíte congela o resultado como
 *    está hoje, não opina sobre unificar.
 * 2. `molde` resolve empate de data ficando com o PRIMEIRO da lista (`>` estrito),
 *    e `fixasPendentes` ignora molde cuja referência seja o próprio mês alvo ou
 *    posterior.
 */
import { describe, it, expect } from 'vitest';
import {
    chaveDescricao,
    molde,
    fixasPendentes,
    totalSugerido,
    type DespesaRecorrente,
    type FixaPendente,
} from './despesa-fixa';

/** Fixas inventadas de três meses do ano 2000. */
const RECORRENTES: DespesaRecorrente[] = [
    { descricao: 'Aluguel', categoria: 'Fixa', valor: 1000, data: '2000-01-05' },
    { descricao: 'Aluguel', categoria: 'Fixa', valor: 1200, data: '2000-03-05', categoriaId: 7 },
    { descricao: 'Internet', categoria: 'Fixa', valor: 200, data: '2000-02-10' },
    { descricao: 'internet.', categoria: 'Fixa', valor: 250, data: '2000-04-10' },
    { descricao: 'Zelador', categoria: null, valor: 500, data: '2000-01-20' },
];

describe('chaveDescricao — normalização para comparar grafias', () => {
    it('corta espaço nas pontas, caixa e ponto final', () => {
        expect(chaveDescricao('  Sistema.  ')).toBe('sistema');
        expect(chaveDescricao('Sistema')).toBe('sistema');
    });

    it('colapsa espaço interno repetido', () => {
        expect(chaveDescricao('Aluguel   =   01')).toBe('aluguel = 01');
    });

    it('duas grafias do mesmo nome caem na mesma chave', () => {
        expect(chaveDescricao('A B')).toBe(chaveDescricao('a  b'));
        expect(chaveDescricao('A B')).toBe('a b');
    });

    it('acento é preservado, só a caixa cai', () => {
        expect(chaveDescricao('ÁGUA')).toBe('água');
    });

    it('come qualquer sequência de pontos e espaços no fim', () => {
        expect(chaveDescricao('Internet...')).toBe('internet');
        expect(chaveDescricao('Internet . . .')).toBe('internet');
    });

    it('descrição vazia, só-espaço ou só-ponto viram string vazia', () => {
        expect(chaveDescricao('')).toBe('');
        expect(chaveDescricao('   ')).toBe('');
        expect(chaveDescricao('.')).toBe('');
    });
});

describe('molde — o lançamento mais recente de cada descrição', () => {
    it('lista vazia devolve lista vazia', () => {
        expect(molde([])).toEqual([]);
    });

    it('fica com o mais recente e ordena por descrição em pt-BR', () => {
        expect(molde(RECORRENTES)).toEqual([
            {
                descricao: 'Aluguel',
                categoria: 'Fixa',
                valor: 1200,
                data: '2000-03-05',
                categoriaId: 7,
            },
            { descricao: 'internet.', categoria: 'Fixa', valor: 250, data: '2000-04-10' },
            { descricao: 'Zelador', categoria: null, valor: 500, data: '2000-01-20' },
        ]);
    });

    it('a ordenação é insensível à caixa: "internet." vem antes de "Zelador"', () => {
        expect(molde(RECORRENTES).map((d) => d.descricao)).toEqual([
            'Aluguel',
            'internet.',
            'Zelador',
        ]);
    });

    it('empate de data fica com o PRIMEIRO da lista (a comparação é estrita)', () => {
        const empate: DespesaRecorrente[] = [
            { descricao: 'Luz', categoria: 'A', valor: 100, data: '2000-01-01' },
            { descricao: 'Luz', categoria: 'B', valor: 900, data: '2000-01-01' },
        ];
        expect(molde(empate)).toEqual([
            { descricao: 'Luz', categoria: 'A', valor: 100, data: '2000-01-01' },
        ]);
    });
});

describe('fixasPendentes — o que ainda falta lançar no mês alvo', () => {
    it('sem recorrente nenhuma, nada pende', () => {
        expect(fixasPendentes([], [], '2000-05')).toEqual([]);
    });

    it('sugere o valor do lançamento mais recente, com a referência de onde veio', () => {
        expect(fixasPendentes(RECORRENTES, [], '2000-05')).toEqual([
            {
                descricao: 'Aluguel',
                categoria: 'Fixa',
                valorSugerido: 1200,
                referencia: '2000-03',
                categoriaId: 7,
            },
            {
                descricao: 'internet.',
                categoria: 'Fixa',
                valorSugerido: 250,
                referencia: '2000-04',
                categoriaId: null,
            },
            {
                descricao: 'Zelador',
                categoria: null,
                valorSugerido: 500,
                referencia: '2000-01',
                categoriaId: null,
            },
        ]);
    });

    it('o que já foi lançado some, mesmo escrito com outra grafia', () => {
        const pendentes = fixasPendentes(RECORRENTES, ['  ALUGUEL. '], '2000-05');
        expect(pendentes.map((p) => p.descricao)).toEqual(['internet.', 'Zelador']);
    });

    it('mês alvo completo devolve lista vazia', () => {
        expect(fixasPendentes(RECORRENTES, ['Aluguel', 'Internet', 'Zelador'], '2000-05')).toEqual(
            []
        );
    });

    it('ignora molde do próprio mês alvo ou posterior', () => {
        // Alvo 2000-03: o aluguel de 2000-03 e a internet de 2000-04 ficam de
        // fora, então a sugestão volta a ser a de janeiro/fevereiro.
        expect(fixasPendentes(RECORRENTES, [], '2000-03')).toEqual([
            {
                descricao: 'Aluguel',
                categoria: 'Fixa',
                valorSugerido: 1000,
                referencia: '2000-01',
                categoriaId: null,
            },
            {
                descricao: 'Internet',
                categoria: 'Fixa',
                valorSugerido: 200,
                referencia: '2000-02',
                categoriaId: null,
            },
            {
                descricao: 'Zelador',
                categoria: null,
                valorSugerido: 500,
                referencia: '2000-01',
                categoriaId: null,
            },
        ]);
    });

    it('mês alvo anterior a tudo não tem de onde sugerir', () => {
        expect(fixasPendentes(RECORRENTES, [], '2000-01')).toEqual([]);
    });

    it('quantiza o valor sugerido em centavos, com o meio centavo para cima', () => {
        const ruidosas: DespesaRecorrente[] = [
            { descricao: 'Ruido', categoria: null, valor: 4315.7600000000002, data: '2000-01-01' },
            { descricao: 'Meio', categoria: null, valor: 10.005, data: '2000-01-01' },
            { descricao: 'Abaixo', categoria: null, valor: 10.004, data: '2000-01-01' },
        ];
        expect(fixasPendentes(ruidosas, [], '2000-02').map((p) => p.valorSugerido)).toEqual([
            10, // Abaixo
            10.01, // Meio
            4315.76, // Ruido
        ]);
    });

    it('categoriaId ausente vira null, nunca undefined', () => {
        const [primeira] = fixasPendentes(RECORRENTES, ['Aluguel', 'Internet'], '2000-05');
        expect(primeira.categoriaId).toBe(null);
    });
});

describe('totalSugerido — quanto entraria se tudo fosse lançado', () => {
    it('lista vazia soma 0', () => {
        expect(totalSugerido([])).toBe(0);
    });

    it('quantiza a soma em centavos e mata o drift de float', () => {
        const pendentes: FixaPendente[] = [
            { descricao: 'A', categoria: null, valorSugerido: 0.1, referencia: '2000-01' },
            { descricao: 'B', categoria: null, valorSugerido: 0.2, referencia: '2000-01' },
        ];
        expect(totalSugerido(pendentes)).toBe(0.3);
    });

    it('soma as pendentes do mês alvo', () => {
        expect(totalSugerido(fixasPendentes(RECORRENTES, [], '2000-05'))).toBe(1950);
    });
});
