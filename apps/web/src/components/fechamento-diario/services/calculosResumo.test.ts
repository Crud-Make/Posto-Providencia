import { describe, it, expect } from 'vitest';
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
