/**
 * Golden de paridade do custo do mês (#103 P9 passo 3b): o caminho da API (`custoMensalDaApi` sobre
 * o `GET /dashboard`) contra o caminho Supabase (`calculaCustoMensal`) e contra a planilha real,
 * mês a mês, de janeiro a julho de 2026 (`docs/data/posto_jorro_2026.sqlite`).
 *
 * O que se prova aqui é o MAPEAMENTO no cliente; o SQL do servidor está preso pelo Pest
 * (`backend/tests/Feature/Agregacao/DashboardTest.php`, bloco `leituras`).
 *
 * Decisões do dono (22/09/2026) que este golden fixa:
 *  - D3: os litros do rateio são os do ENCERRANTE (salto do odômetro), não a Σ dos dias lançados.
 *    Só fevereiro difere no dado real: 38.509,099 L contra 29.374,536 L (dias 09–15 sem fechamento),
 *    e o rateio vai de 0,6152 para 0,4693 R$/L.
 *  - A despesa entra como UM `Number` quantizado por `emCentavos`.
 *
 * Forma que morde (memória golden-que-arredonda-nao-morde): igualdade EXATA (`toBe`) entre os dois
 * caminhos e contra a referência calculada à parte; nada é arredondado do lado do módulo antes de
 * comparar.
 *
 * Roda sob `bun test` (script `test:golden`); o vitest ignora (`*.spec.ts`).
 */
import { describe, test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { despesaOperacionalPorLitro, emCentavos } from '@posto/utils';
import type { DashboardDaApi } from '../../../services/api/dashboard.api';
import {
  calculaCustoMensal,
  custoMensalDaApi,
  type BicoDoCusto,
  type LinhaLeituraDoMes,
} from './custo-mensal';

const SQLITE = `${import.meta.dir}/../../../../../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

const MESES = [1, 2, 3, 4, 5, 6, 7] as const;

interface LinhaEncerrante {
  dia: number;
  bico: string;
  inicial: number | null;
  fechamento: number | null;
  litros: number | null;
}
interface LinhaCompra {
  produto: string;
  compra_lt: number;
  compra_rs: number;
  media_lt: number;
}
interface LinhaResumoBico {
  inicial: number;
  fechamento: number;
}

const emMl = (litros: number): number => Math.round(litros * 1000);
const mm = (mes: number): string => String(mes).padStart(2, '0');

function encerranteDoMes(mes: number): LinhaEncerrante[] {
  return db
    .query('SELECT dia, bico, inicial, fechamento, litros FROM encerrante_diario WHERE ano=2026 AND mes=? ORDER BY bico, dia')
    .all(mes) as LinhaEncerrante[];
}

/** No banco a `Leitura` tem os dois encerrantes NOT NULL: dia sem um deles não vira linha. */
function diasCompletos(mes: number): (LinhaEncerrante & { inicial: number; fechamento: number })[] {
  return encerranteDoMes(mes).filter(
    (l): l is LinhaEncerrante & { inicial: number; fechamento: number } => l.inicial !== null && l.fechamento !== null
  );
}

function comprasDoMes(mes: number): LinhaCompra[] {
  return db
    .query('SELECT produto, compra_lt, compra_rs, media_lt FROM compra_mensal WHERE ano=2026 AND mes=? ORDER BY produto')
    .all(mes) as LinhaCompra[];
}

function despesaDoMes(mes: number): number {
  const linha = db.query('SELECT valor FROM despesa_mensal WHERE ano=2026 AND mes=?').get(mes) as { valor: number };
  return linha.valor;
}

/** Litros do encerrante pela PLANILHA (bloco Resumo Mensal): Σ por bico de fechamento − inicial, em mL. */
function litrosDoEncerrantePelaPlanilha(mes: number): number {
  const bicos = db
    .query('SELECT inicial, fechamento FROM resumo_mensal_bico WHERE ano=2026 AND mes=?')
    .all(mes) as LinhaResumoBico[];
  return bicos.reduce((acc, b) => acc + (emMl(b.fechamento) - emMl(b.inicial)), 0) / 1000;
}

/** Σ dos litros dos dias lançados — o que `rateio.litros_vendidos` da API devolve. */
function litrosSomadosDosDias(mes: number): number {
  return diasCompletos(mes).reduce((acc, l) => acc + emMl(l.fechamento - l.inicial), 0) / 1000;
}

/** Id estável por nome de bico dentro do mês. */
function idsDosBicos(linhas: readonly { bico: string }[]): Map<string, number> {
  return new Map([...new Set(linhas.map(l => l.bico))].map((nome, i) => [nome, i + 1]));
}

/** Produto sem compra no dado real: prova que `null` sobrevive ao caminho da API. */
const PRODUTO_SEM_COMPRA = 'Querosene (sem compra)';

/** Um "bico" por produto da compra do mês, mais um produto que nunca teve compra. */
function bicosDoMes(mes: number): BicoDoCusto[] {
  const produtos = comprasDoMes(mes).map(c => c.produto);
  return [...produtos, PRODUTO_SEM_COMPRA].map((nome, i) => ({ combustivel: { id: 100 + i, nome } }));
}

/**
 * O `DashboardDaApi` que o Laravel devolveria para o mês civil: compra somada por produto,
 * despesa em string decimal, `rateio.litros_vendidos` = Σ dos dias, e as leituras cruas.
 */
function dashboardDoMes(mes: number, despesaEmTexto: string, leiturasNaOrdem = true): DashboardDaApi {
  const compras = comprasDoMes(mes);
  const bicos = bicosDoMes(mes);
  const dias = diasCompletos(mes);
  const ids = idsDosBicos(dias);
  const leituras = dias.map(l => ({
    bico_id: ids.get(l.bico) ?? 0,
    data: `2026-${mm(mes)}-${String(l.dia).padStart(2, '0')}`,
    leitura_inicial: l.inicial.toFixed(3),
    leitura_final: l.fechamento.toFixed(3),
  }));
  const ultimo = new Date(2026, mes, 0).getDate();

  return {
    periodo: { inicio: `2026-${mm(mes)}-01`, fim: `2026-${mm(mes)}-${ultimo}` },
    produtos: bicos.map(b => {
      const compra = compras.find(c => c.produto === b.combustivel.nome);
      return {
        combustivel_id: b.combustivel.id,
        produto: b.combustivel.nome,
        litros_vendidos: '0.000',
        receita: '0.00',
        compras: {
          litros: (compra?.compra_lt ?? 0).toFixed(3),
          valor_total: (compra?.compra_rs ?? 0).toFixed(2),
        },
      };
    }),
    rateio: {
      mes_civil: { inicio: `2026-${mm(mes)}-01`, fim: `2026-${mm(mes)}-${ultimo}` },
      despesas_total: despesaEmTexto,
      litros_vendidos: litrosSomadosDosDias(mes).toFixed(3),
    },
    // A API devolve em ordem de bico e dia; `leiturasNaOrdem = false` embaralha para provar que o
    // caminho da API não depende da ordem (a D5 do caminho Supabase não chega por aqui).
    leituras: leiturasNaOrdem ? leituras : [...leituras].reverse(),
  };
}

/** As mesmas linhas como o Supabase as devolve para `calculaCustoMensal`, em ordem de bico e dia. */
function leiturasDoSupabase(mes: number): LinhaLeituraDoMes[] {
  const dias = diasCompletos(mes);
  const ids = idsDosBicos(dias);
  return dias.map(l => ({
    bico_id: ids.get(l.bico) ?? 0,
    leitura_inicial: l.inicial.toFixed(3),
    leitura_final: l.fechamento.toFixed(3),
    valor_total: null,
  }));
}

describe('custo do mês pela API × planilha × caminho Supabase (#103 P9 passo 3b)', () => {
  for (const mes of MESES) {
    const despesa = emCentavos(despesaDoMes(mes));
    const dash = dashboardDoMes(mes, despesa.toFixed(2));
    const bicos = bicosDoMes(mes);
    const pelaApi = custoMensalDaApi(dash, bicos);

    test(`${mm(mes)}/2026: custo por produto = compra_mensal.media_lt da planilha, exato; produto sem compra = null`, () => {
      for (const c of comprasDoMes(mes)) {
        expect(pelaApi.custoMedioPorProduto[c.produto]).toBe(c.compra_rs / c.compra_lt);
        expect(pelaApi.custoMedioPorProduto[c.produto]).toBe(c.media_lt);
      }
      expect(Object.keys(pelaApi.custoMedioPorProduto)).toContain(PRODUTO_SEM_COMPRA);
      expect(pelaApi.custoMedioPorProduto[PRODUTO_SEM_COMPRA]).toBeNull();
    });

    test(`${mm(mes)}/2026: rateio = despesa do mês (em centavos) ÷ litros do ENCERRANTE da planilha, exato`, () => {
      const esperado = despesaOperacionalPorLitro(despesa, litrosDoEncerrantePelaPlanilha(mes));
      expect(pelaApi.despesaOperacionalLitro).toBe(esperado);
      expect(pelaApi.temDespesa).toBe(despesa !== 0);
    });

    test(`${mm(mes)}/2026: paridade exata com o caminho Supabase no mês civil (custo e rateio)`, () => {
      const peloSupabase = calculaCustoMensal(
        leiturasDoSupabase(mes),
        dash.produtos.map(p => ({
          combustivel_id: p.combustivel_id,
          quantidade_litros: p.compras.litros,
          valor_total: p.compras.valor_total,
        })),
        [{ valor: despesa.toFixed(2) }],
        bicos
      );
      expect(pelaApi.custoMedioPorProduto).toEqual(peloSupabase.custoMedioPorProduto);
      expect(pelaApi.despesaOperacionalLitro).toBe(peloSupabase.despesaOperacionalLitro);
      expect(pelaApi.temDespesa).toBe(peloSupabase.temDespesa);
    });

    test(`${mm(mes)}/2026: leituras fora de ordem dão o mesmo rateio (a D5 não chega pela API)`, () => {
      const embaralhado = custoMensalDaApi(dashboardDoMes(mes, despesa.toFixed(2), false), bicos);
      expect(embaralhado.despesaOperacionalLitro).toBe(pelaApi.despesaOperacionalLitro);
    });

    test(`${mm(mes)}/2026: despesa com resíduo de float na string é quantizada antes de dividir`, () => {
      // A soma em float da planilha deixa resíduo em abril e junho (20105.210000000003). O contrato
      // manda escala 2, mas o Zod aceita qualquer escala — então o cliente quantiza.
      const cru = custoMensalDaApi(dashboardDoMes(mes, String(despesaDoMes(mes))), bicos);
      expect(cru.despesaOperacionalLitro).toBe(pelaApi.despesaOperacionalLitro);
    });
  }

  test('D3 em fevereiro: 0,4693 R$/L pelo encerrante, e NÃO 0,6152 pela Σ dos dias lançados', () => {
    const despesa = emCentavos(despesaDoMes(2));
    const pelaApi = custoMensalDaApi(dashboardDoMes(2, despesa.toFixed(2)), bicosDoMes(2));

    expect(litrosDoEncerrantePelaPlanilha(2)).toBe(38509.099);
    expect(litrosSomadosDosDias(2)).toBe(29374.536);
    expect(pelaApi.despesaOperacionalLitro).toBe(18071.12 / 38509.099);
    expect(pelaApi.despesaOperacionalLitro).not.toBe(18071.12 / 29374.536);
    expect(pelaApi.despesaOperacionalLitro.toFixed(4)).toBe('0.4693');
  });

  test('nos outros seis meses o encerrante e a Σ dos dias coincidem — só fevereiro muda com a D3', () => {
    for (const mes of MESES.filter(m => m !== 2)) {
      expect(litrosSomadosDosDias(mes)).toBe(litrosDoEncerrantePelaPlanilha(mes));
    }
  });
});
