import { describe, it, expect } from 'vitest';
import { limitesDoMes, montarResumoMensal } from './useResumoMensalFrentistas';

const linha = (frentista_id: number, nome: string, v: Partial<{
  valor_pix: number; valor_cartao_credito: number; valor_cartao_debito: number; valor_cartao: number;
  valor_dinheiro: number; valor_nota: number; baratao: number; valor_moedas: number; encerrante: number;
}>) => ({ frentista_id, frentista: { nome }, ...v });

describe('limitesDoMes', () => {
  it('cobre o mês inteiro, inclusive fevereiro e meses de 30 dias', () => {
    expect(limitesDoMes('2026-02-15')).toEqual({ inicio: '2026-02-01', fim: '2026-02-28' });
    expect(limitesDoMes('2026-08-30')).toEqual({ inicio: '2026-08-01', fim: '2026-08-31' });
    expect(limitesDoMes('2026-09-01')).toEqual({ inicio: '2026-09-01', fim: '2026-09-30' });
  });
});

describe('montarResumoMensal', () => {
  it('soma os envios do mês por frentista e por forma, como o bloco Caixa Dia 01 a 31', () => {
    const { colunas, caixa } = montarResumoMensal([
      linha(1, 'Leandro', { valor_pix: 1076, valor_cartao_credito: 450, valor_cartao_debito: 668, valor_dinheiro: 1101.53, valor_nota: 385, baratao: 279.2, valor_moedas: 6, encerrante: 3965.73 }),
      linha(1, 'Leandro', { valor_pix: 1000, valor_dinheiro: 500, encerrante: 1510 }),
      linha(2, 'Paulo', { valor_pix: 416, valor_cartao: 390, valor_dinheiro: 559.97, valor_nota: 320, valor_moedas: 1, encerrante: 1686.97 }),
    ]);

    expect(colunas).toHaveLength(2);
    const leandro = colunas.find((c) => c.nome === 'Leandro')!;
    expect(leandro.envios).toBe(2);
    expect(leandro.pix).toBeCloseTo(2076, 2);
    expect(leandro.credito).toBeCloseTo(450, 2);
    expect(leandro.debito).toBeCloseTo(668, 2);
    expect(leandro.dinheiro).toBeCloseTo(1601.53, 2);
    expect(leandro.vendaFrentista).toBeCloseTo(3965.73 + 1500, 2);
    expect(leandro.vendaConcentrador).toBeCloseTo(5475.73, 2);
    // concentrador − frentistas: 1510 − 1500 = 10 de FALTA
    expect(leandro.falta).toBeCloseTo(10, 2);

    const paulo = colunas.find((c) => c.nome === 'Paulo')!;
    // cartão legado sem separar entra no débito
    expect(paulo.debito).toBeCloseTo(390, 2);
    expect(paulo.credito).toBe(0);
    expect(paulo.falta).toBeCloseTo(0, 2);

    expect(caixa.vendaFrentista).toBeCloseTo(leandro.vendaFrentista + paulo.vendaFrentista, 2);
    expect(caixa.pix).toBeCloseTo(2492, 2);
    expect(caixa.participacao).toBe(100);
    expect(leandro.participacao + paulo.participacao).toBeCloseTo(100, 6);
  });

  it('frentista do mês é a maior Venda Frentistas, não o primeiro da lista', () => {
    const { frentistaDoMes, colunas } = montarResumoMensal([
      linha(2, 'Paulo', { valor_dinheiro: 100 }),
      linha(1, 'Leandro', { valor_dinheiro: 900 }),
    ]);
    expect(frentistaDoMes?.nome).toBe('Leandro');
    expect(colunas.map((c) => c.nome)).toEqual(['Leandro', 'Paulo']);
  });

  it('mês vazio não elege ninguém', () => {
    const { frentistaDoMes, colunas, caixa } = montarResumoMensal([]);
    expect(frentistaDoMes).toBeNull();
    expect(colunas).toEqual([]);
    expect(caixa.vendaFrentista).toBe(0);
    expect(caixa.participacao).toBe(0);
  });
});
