import { describe, it, expect } from 'vitest';
import { cartao, conferido } from '@posto/utils';
import { meiosDaSessao } from '../../../utils/fechamentoMeios';
import { calcularTotaisPagamentos, gerarTabelaDetalhamento } from './calculosResumo';
import type { SessaoFrentista, Frentista } from '../../../types/fechamento';

function sessao(overrides: Partial<SessaoFrentista> = {}): SessaoFrentista {
    return {
        tempId: 't1',
        frentistaId: 1,
        valor_cartao: '0',
        valor_cartao_debito: '0',
        valor_cartao_credito: '0',
        valor_nota: '0',
        valor_pix: '0',
        valor_dinheiro: '0',
        valor_baratao: '0',
        valor_moedas: '0',
        valor_encerrante: '0',
        valor_conferido: '0',
        observacoes: '',
        ...overrides,
    };
}

describe('calculosResumo — regressão do bug de moedas fora da soma', () => {
    it('calcularTotaisPagamentos inclui valor_moedas no bucket Outros junto com o baratão', () => {
        const sessoes = [sessao({ valor_baratao: '50,00', valor_moedas: '200,00' })];

        const resultado = calcularTotaisPagamentos(sessoes);
        const outros = resultado.find((r) => r.name === 'Outros');

        expect(outros?.value).toBe(250);
    });

    it('gerarTabelaDetalhamento soma valor_moedas na linha Outros por frentista', () => {
        const frentistas: Frentista[] = [{ id: 1, nome: 'João', ativo: true } as Frentista];
        const sessoes = [sessao({ valor_baratao: '50,00', valor_moedas: '200,00' })];

        const linhas = gerarTabelaDetalhamento(sessoes, frentistas);
        const linhaOutros = linhas.find((l) => l.meio === 'Outros');

        expect(linhaOutros?.total).toBe(250);
        expect(linhaOutros?.['t1']).toBe(250);
    });
});

describe('calculosResumo — invariantes contra os meios canônicos (onda 3, 3.8)', () => {
    // O lump legado `valor_cartao` entra no débito (convenção histórica da tela),
    // e o split débito+crédito tem de reconstituir `cartao()` — se alguém mexer
    // num balde sem passar por `meiosDaSessao`, isto quebra.
    const cheia = sessao({
        valor_dinheiro: '100,00',
        valor_moedas: '2,50',
        valor_pix: '300,00',
        valor_cartao: '40,00',
        valor_cartao_debito: '60,00',
        valor_cartao_credito: '80,00',
        valor_nota: '25,00',
        valor_baratao: '10,00',
    });

    it('débito + crédito das fatias do gráfico reconstitui cartao()', () => {
        const resultado = calcularTotaisPagamentos([cheia]);
        const debito = resultado.find((r) => r.name === 'Cartão Débito')?.value ?? 0;
        const credito = resultado.find((r) => r.name === 'Cartão Crédito')?.value ?? 0;

        expect(debito).toBe(100); // 60 declarados + 40 do lump legado
        expect(debito + credito).toBe(cartao(meiosDaSessao(cheia)));
    });

    it('a soma de todas as fatias é o conferido() canônico da sessão', () => {
        const soma = calcularTotaisPagamentos([cheia]).reduce((acc, r) => acc + r.value, 0);
        expect(soma).toBe(conferido(meiosDaSessao(cheia)));
    });

    it('a tabela pivô fecha com o mesmo conferido() por frentista', () => {
        const frentistas: Frentista[] = [{ id: 1, nome: 'João', ativo: true } as Frentista];
        const linhas = gerarTabelaDetalhamento([cheia], frentistas);
        const soma = linhas.reduce((acc, l) => acc + l.total, 0);
        expect(soma).toBe(conferido(meiosDaSessao(cheia)));
    });
});
