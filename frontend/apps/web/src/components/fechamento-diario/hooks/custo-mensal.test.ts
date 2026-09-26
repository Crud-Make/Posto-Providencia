/**
 * `calculaCustoMensal` — os mesmos casos que `useCustoMensal.test.ts` prende pelo hook,
 * agora direto na função pura (#103 P9 passo 2). Nenhuma fórmula mudou na extração.
 */
import { describe, it, expect } from 'vitest';
import type { BicoComDetalhes } from '../../../types/fechamento';
import type { DashboardDaApi } from '../../../services/api/dashboard.api';
import {
  calculaCustoMensal,
  custoMensalDaApi,
  type LinhaCompraDoMes,
  type LinhaDespesaDoMes,
  type LinhaLeituraDoMes,
} from './custo-mensal';

function bico(id: number, combustivelId: number, nome: string): BicoComDetalhes {
  return {
    id,
    numero: id,
    bomba: { id: 1, nome: 'Bomba 1' },
    combustivel: { id: combustivelId, nome, preco_venda: 6 },
  } as unknown as BicoComDetalhes;
}

const BICOS: readonly BicoComDetalhes[] = [
  bico(1, 10, 'Gasolina Comum'),
  bico(2, 10, 'Gasolina Comum'),
  bico(3, 20, 'Diesel S10'),
  bico(4, 30, 'Etanol'),
];

const SEM_LEITURA: readonly LinhaLeituraDoMes[] = [];
const SEM_COMPRA: readonly LinhaCompraDoMes[] = [];
const SEM_DESPESA: readonly LinhaDespesaDoMes[] = [];

function leitura(
  bicoId: number,
  inicial: number | string | null,
  final: number | string | null,
  valor: number | string | null = null
): LinhaLeituraDoMes {
  return { bico_id: bicoId, leitura_inicial: inicial, leitura_final: final, valor_total: valor };
}

describe('calculaCustoMensal (#103 P9 passo 2)', () => {
  describe('custo médio por produto', () => {
    it('é Σvalor ÷ Σlitros das compras do produto; produto sem compra dá null, nunca 0', () => {
      const r = calculaCustoMensal(
        SEM_LEITURA,
        [
          { combustivel_id: 10, quantidade_litros: 1000, valor_total: 5000 },
          { combustivel_id: 10, quantidade_litros: 3000, valor_total: 18000 },
          { combustivel_id: 20, quantidade_litros: '2000', valor_total: '11000' },
        ],
        SEM_DESPESA,
        BICOS
      );

      expect(r.custoMedioPorProduto).toEqual({
        'Gasolina Comum': 23000 / 4000,
        'Diesel S10': 11000 / 2000,
        Etanol: null,
      });
    });

    it('agrupa por NOME do produto: dois bicos do mesmo combustível dão uma chave só', () => {
      const r = calculaCustoMensal(SEM_LEITURA, SEM_COMPRA, SEM_DESPESA, BICOS);

      expect(Object.keys(r.custoMedioPorProduto).sort()).toEqual(['Diesel S10', 'Etanol', 'Gasolina Comum']);
    });

    it('ignora compra de combustível sem bico e compra com combustivel_id null', () => {
      const r = calculaCustoMensal(
        SEM_LEITURA,
        [
          { combustivel_id: 99, quantidade_litros: 500, valor_total: 99999 },
          { combustivel_id: null, quantidade_litros: 500, valor_total: 99999 },
          { combustivel_id: 30, quantidade_litros: 100, valor_total: 450 },
        ],
        SEM_DESPESA,
        BICOS
      );

      expect(r.custoMedioPorProduto).toEqual({ 'Gasolina Comum': null, 'Diesel S10': null, Etanol: 4.5 });
    });

    it('sem bicos, não há produto nenhum', () => {
      const r = calculaCustoMensal(
        SEM_LEITURA,
        [{ combustivel_id: 10, quantidade_litros: 1000, valor_total: 5000 }],
        SEM_DESPESA,
        []
      );

      expect(r.custoMedioPorProduto).toEqual({});
    });
  });

  describe('rateio da despesa operacional', () => {
    it('é despesa do mês ÷ litros do encerranteMensal; temDespesa = há linha de Despesa', () => {
      const r = calculaCustoMensal(
        [leitura(1, 1000, 1600, 3600), leitura(1, 1600, 2000, 2400), leitura(3, '5000.5', '6000.5', '6000')],
        SEM_COMPRA,
        [{ valor: 1200 }, { valor: '800' }],
        BICOS
      );

      expect(r.despesaOperacionalLitro).toBe(2000 / 2000);
      expect(r.temDespesa).toBe(true);
    });

    it('sem nenhuma linha de Despesa: temDespesa false e rateio 0', () => {
      const r = calculaCustoMensal([leitura(1, 0, 100, 600)], SEM_COMPRA, SEM_DESPESA, BICOS);

      expect(r.despesaOperacionalLitro).toBe(0);
      expect(r.temDespesa).toBe(false);
    });

    it('com despesa e sem litros: rateio 0, temDespesa segue true', () => {
      const r = calculaCustoMensal(SEM_LEITURA, SEM_COMPRA, [{ valor: 500 }], BICOS);

      expect(r.despesaOperacionalLitro).toBe(0);
      expect(r.temDespesa).toBe(true);
    });

    it('leitura com final null: o dia parcial fica de fora do salto', () => {
      const r = calculaCustoMensal(
        [leitura(1, 1000, 1500), leitura(1, 1500, null)],
        SEM_COMPRA,
        [{ valor: 1000 }],
        BICOS
      );

      expect(r.despesaOperacionalLitro).toBe(1000 / 500);
    });
  });

  describe('DEFEITOS CONHECIDOS — fixados como estão, não corrigir nesta fatia', () => {
    it('D5: toda leitura entra com dia 1, então o salto depende da ORDEM das linhas', () => {
      const despesa = [{ valor: 1000 }];
      const invertida = calculaCustoMensal([leitura(1, 1100, 1200), leitura(1, 1000, 1100)], SEM_COMPRA, despesa, BICOS);
      const emOrdem = calculaCustoMensal([leitura(1, 1000, 1100), leitura(1, 1100, 1200)], SEM_COMPRA, despesa, BICOS);

      expect(invertida.despesaOperacionalLitro).toBe(0);
      expect(emOrdem.despesaOperacionalLitro).toBe(1000 / 200);
    });

    it('a despesa é somada em float, sem emCentavos: 0,10 + 0,20 sobre 1 L dá 0.30000000000000004', () => {
      const r = calculaCustoMensal([leitura(1, 0, 1)], SEM_COMPRA, [{ valor: 0.1 }, { valor: 0.2 }], BICOS);

      expect(r.despesaOperacionalLitro).toBe(0.1 + 0.2);
      expect(r.despesaOperacionalLitro).not.toBe(0.3);
    });

    it('listas vazias (o que o hook passa quando o Supabase erra) viram "sem compra", "sem despesa" e rateio 0', () => {
      expect(calculaCustoMensal(SEM_LEITURA, SEM_COMPRA, SEM_DESPESA, BICOS)).toEqual({
        custoMedioPorProduto: { 'Gasolina Comum': null, 'Diesel S10': null, Etanol: null },
        despesaOperacionalLitro: 0,
        temDespesa: false,
      });
    });
  });
});

describe('custoMensalDaApi (#103 P9 passo 3b)', () => {
  const DASH_VAZIO: DashboardDaApi = {
    periodo: { inicio: '2026-01-01', fim: '2026-01-31' },
    produtos: [],
    rateio: { mes_civil: { inicio: '2026-01-01', fim: '2026-01-31' }, despesas_total: '0.00', litros_vendidos: '0.000' },
    leituras: [],
  };

  it('mês sem leitura, sem compra e sem despesa: rateio 0, temDespesa false, todo produto dos bicos em null', () => {
    const r = custoMensalDaApi(DASH_VAZIO, BICOS);

    expect(r.despesaOperacionalLitro).toBe(0);
    expect(r.temDespesa).toBe(false);
    expect(r.custoMedioPorProduto).toEqual({ 'Gasolina Comum': null, 'Diesel S10': null, Etanol: null });
  });

  it('despesa sem litros no encerrante dá rateio 0, mas temDespesa true', () => {
    const r = custoMensalDaApi({ ...DASH_VAZIO, rateio: { ...DASH_VAZIO.rateio, despesas_total: '900.00' } }, BICOS);

    expect(r.despesaOperacionalLitro).toBe(0);
    expect(r.temDespesa).toBe(true);
  });

  it('usa o salto do encerrante por bico e ignora rateio.litros_vendidos (D3)', () => {
    const r = custoMensalDaApi(
      {
        ...DASH_VAZIO,
        rateio: { ...DASH_VAZIO.rateio, despesas_total: '900.00', litros_vendidos: '1.000' },
        leituras: [
          { bico_id: 1, data: '2026-01-01', leitura_inicial: '1000.000', leitura_final: '1500.000' },
          // dia 02 faltando: o salto cobre a lacuna (1000 → 2000 = 1000 L), a Σ daria 800 L
          { bico_id: 1, data: '2026-01-03', leitura_inicial: '1700.000', leitura_final: '2000.000' },
          { bico_id: 2, data: '2026-01-01', leitura_inicial: '0.000', leitura_final: '800.000' },
        ],
      },
      BICOS
    );

    expect(r.despesaOperacionalLitro).toBe(900 / 1800);
  });

  it('compra 0/0 da API (produto sem compra no mês) dá null, nunca 0', () => {
    const r = custoMensalDaApi(
      {
        ...DASH_VAZIO,
        produtos: [
          { combustivel_id: 10, produto: 'Gasolina Comum', litros_vendidos: '0.000', receita: '0.00', compras: { litros: '4000.000', valor_total: '23000.00' } },
          { combustivel_id: 20, produto: 'Diesel S10', litros_vendidos: '0.000', receita: '0.00', compras: { litros: '0.000', valor_total: '0.00' } },
        ],
      },
      BICOS
    );

    expect(r.custoMedioPorProduto).toEqual({ 'Gasolina Comum': 23000 / 4000, 'Diesel S10': null, Etanol: null });
  });
});
