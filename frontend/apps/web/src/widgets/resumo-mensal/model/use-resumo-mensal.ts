import { useState, useEffect, useCallback } from 'react';
import {
  encerranteMensal,
  resumoPorProduto,
  resumoCompra,
  resumoEstoque,
  despesaOperacionalPorLitro,
  type LeituraDiariaBico,
  type EntradaBicoMes,
  type ResumoProdutos,
  type ResumoCompra,
  type ResumoEstoque,
} from '@posto/utils';
import { somarDias, deIsoLocal } from '@posto/utils';
import { visaoDoProprietarioPelaApi } from '@/services/api/proprietario.api';
import {
  insumosDaApi,
  insumosDoSupabase,
  type FornecedorDoBanco,
  type InsumosDoResumo,
  type MedicaoDoBanco,
  type TanqueDoBanco,
} from './insumos-do-resumo';
import { intervaloDoMes, type Periodo } from '@/utils/periodo';
import { hojeIso } from '@/utils/periodo';

/**
 * Dados do resumo mensal do posto, na mesma quebra que a planilha do dono usa.
 *
 * @remarks Os três blocos são independentes: um mês pode ter venda sem compra
 *          lançada, ou compra sem medição de tanque. Cada bloco vem `null`
 *          quando não tem fonte, em vez de vir zerado — zero aqui seria lido
 *          como "não vendeu", "não comprou" ou "não perdeu".
 */
export interface DadosResumoMensal {
  readonly venda: ResumoProdutos;
  readonly compra: ResumoCompra | null;
  readonly estoque: ResumoEstoque | null;
  /** Produtos que venderam no mês mas não têm compra lançada — lucro não apurável. */
  readonly produtosSemCusto: readonly string[];
  /**
   * Produtos sem medição de tanque na abertura do período.
   *
   * @remarks Sem o volume de abertura não existe estoque teórico, e sem estoque
   *          teórico não existe perda apurável. Eles ficam fora do bloco de
   *          estoque e são listados aqui para a tela poder dizer quem faltou.
   */
  readonly produtosSemAbertura: readonly string[];
  readonly despesaDoMes: number;
  /** Ligação produto → ids do banco, para os formulários de lançamento. */
  readonly referencias: readonly ReferenciaProduto[];
  readonly fornecedores: readonly Fornecedor[];
  /** Intervalo do mês exibido. */
  readonly periodo: Periodo;
  /**
   * Data usada para a medição de abertura: o dia **anterior** ao início do
   * período.
   *
   * @remarks É o `Ano passado.` da planilha — o estoque com que o mês começa é o
   *          que sobrou no fecho do período anterior, não uma medição feita
   *          dentro do mês.
   */
  readonly dataAbertura: string;
}

/** Ids que ligam um produto às tabelas de compra e de tanque. */
export interface ReferenciaProduto {
  readonly produto: string;
  /** Código do combustível (GC/GA/ET/S10) — chave das cores da planilha. */
  readonly codigo: string | null;
  readonly combustivelId: number | null;
  readonly tanqueId: number | null;
}

export type Fornecedor = FornecedorDoBanco;



interface RetornoHook {
  dados: DadosResumoMensal | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

const num = (valor: number | string | null | undefined): number => Number(valor ?? 0);

/**
 * Dia do mês a partir do timestamp do banco, **sem** passar por fuso.
 *
 * @remarks `new Date(iso).getDate()` converte de UTC para o horário local e joga
 *          cada leitura um dia para trás — o posto está em GMT-3 e o banco grava
 *          meia-noite UTC. Recortar a string é o que mantém 01/01 sendo 01/01.
 */
const diaDoIso = (iso: string): number => Number(iso.slice(8, 10));

/** Rótulo do bico como o dono lê: `Bico 01 · Gasolina Comum`. */
const rotuloBico = (numero: number, produto: string): string =>
  `Bico ${String(numero).padStart(2, '0')} · ${produto}`;

/**
 * Resumo mensal por produto, compra e estoque — os três blocos da aba de resumo
 * da planilha, apurados a partir do banco.
 *
 * @param postoId - Posto a consultar.
 * @param mesIso - Mês a exibir, ISO local `aaaa-mm`.
 *
 * @remarks Todo o cálculo mora em `@posto/utils` (`resumo-produto`,
 *          `resumo-compra`, `resumo-estoque`), coberto por golden master contra
 *          os 7 meses reais de 2026. Este hook só busca, mapeia e monta a
 *          entrada — nenhuma fórmula aqui.
 */
export function useResumoMensal(postoId: number | null, mesIso: string): RetornoHook {
  const [dados, setDados] = useState<DadosResumoMensal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!postoId) {
      setDados(null);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const periodo: Periodo = intervaloDoMes(mesIso, hojeIso());

      const insumos = await lerInsumos(postoId, periodo);
      if (insumos === null) {
        setErro('Falha ao carregar o resumo mensal.');
        return;
      }
      const { bicos, combustiveis, leituras, compras, despesas, tanques, fornecedores, medicoes } = insumos;

      const nomeProduto = new Map(combustiveis.map((c) => [c.id, c.nome]));
      const produtoDoBico = new Map(
        bicos.map((b) => [
          b.id,
          b.combustivel_id !== null ? nomeProduto.get(b.combustivel_id) ?? 'Sem produto' : 'Sem produto',
        ])
      );
      const rotuloDoBico = new Map(
        bicos.map((b) => [b.id, rotuloBico(b.numero, produtoDoBico.get(b.id) as string)])
      );

      // ── Bloco 1: venda por bico ────────────────────────────────────────────
      // A agregação do mês é a mesma que a tela de fechamento mensal usa: salto
      // do encerrante, dia parcial de fora. Reusar é o que garante que os dois
      // lugares nunca divirjam.
      const diarias: LeituraDiariaBico[] = leituras.map((l) => ({
        dia: diaDoIso(l.data),
        bico: rotuloDoBico.get(l.bico_id) ?? `Bico ${l.bico_id}`,
        inicial: l.leitura_inicial === null ? null : num(l.leitura_inicial),
        fechamento: l.leitura_final === null ? null : num(l.leitura_final),
        valorDia: l.valor_total === null ? null : num(l.valor_total),
      }));

      const mensal = encerranteMensal(diarias);

      // Custo médio ponderado do mês, por produto. Sem compra no período o custo
      // fica `null` — nunca o `preco_custo` do cadastro, que é o preço de hoje.
      const compraPorProduto = new Map<string, { litros: number; valor: number }>();
      for (const c of compras) {
        const produto = c.combustivel_id !== null ? nomeProduto.get(c.combustivel_id) : undefined;
        if (!produto) continue;
        const atual = compraPorProduto.get(produto) ?? { litros: 0, valor: 0 };
        compraPorProduto.set(produto, {
          litros: atual.litros + num(c.quantidade_litros),
          valor: atual.valor + num(c.valor_total),
        });
      }

      const custoMedioDoProduto = (produto: string): number | null => {
        const c = compraPorProduto.get(produto);
        return c && c.litros > 0 ? c.valor / c.litros : null;
      };

      // O rótulo do bico carrega o produto no fim (`Bico 01 · Gasolina Comum`);
      // é por ele que se reagrupa depois da agregação por bico.
      const produtoDoRotulo = new Map(
        bicos.map((b) => [rotuloDoBico.get(b.id) as string, produtoDoBico.get(b.id) as string])
      );

      const entradas: EntradaBicoMes[] = mensal.bicos.map((b) => {
        const produto = produtoDoRotulo.get(b.bico) ?? 'Sem produto';
        return {
          bico: b.bico,
          produto,
          inicial: b.inicial,
          fechamento: b.fechamento,
          litros: b.litros,
          venda: b.bruto,
          precoMedio: b.precoMedio,
          custoMedio: custoMedioDoProduto(produto),
        };
      });

      const valoresDespesa = despesas.map((d) => num(d.valor));
      const despesaDoMes = valoresDespesa.reduce((acc, v) => acc + v, 0);
      const rateio = despesaOperacionalPorLitro(despesaDoMes, mensal.litros);
      const temDespesa = valoresDespesa.length > 0;

      const venda = resumoPorProduto(entradas, rateio, temDespesa);

      const produtosSemCusto = [
        ...new Set(
          entradas.filter((e) => e.custoMedio === null && e.litros > 0).map((e) => e.produto)
        ),
      ];

      // ── Bloco 2: compra e custo ────────────────────────────────────────────
      const compra =
        compraPorProduto.size > 0
          ? resumoCompra(
              [...compraPorProduto.entries()].map(([produto, c]) => ({
                produto,
                litros: c.litros,
                valor: c.valor,
              })),
              rateio,
              temDespesa
            )
          : null;

      // ── Bloco 3: estoque e perda ───────────────────────────────────────────
      const estoque = montarEstoque(
        tanques,
        medicoes,
        nomeProduto,
        periodo,
        compraPorProduto,
        venda
      );

      // Um produto entra na lista de lançamento se existe no cadastro, mesmo sem
      // venda no mês — é justamente o produto sem movimento que precisa receber
      // compra ou medição.
      const tanqueDoProduto = new Map<string, number>();
      for (const t of tanques) {
        const produto = produtoDoTanque(t, nomeProduto);
        if (!tanqueDoProduto.has(produto)) tanqueDoProduto.set(produto, t.id);
      }

      const referencias: ReferenciaProduto[] = combustiveis.map((c) => ({
        produto: c.nome,
        codigo: c.codigo ?? null,
        combustivelId: c.id,
        tanqueId: tanqueDoProduto.get(c.nome) ?? null,
      }));

      setDados({
        venda,
        compra,
        estoque: estoque.resumo,
        produtosSemCusto,
        produtosSemAbertura: estoque.semAbertura,
        despesaDoMes,
        referencias,
        fornecedores,
        periodo,
        dataAbertura: diaAnterior(periodo.inicio),
      });
    } catch (e) {
      console.error('Erro ao carregar resumo mensal:', e);
      setErro('Falha ao carregar o resumo mensal.');
    } finally {
      setCarregando(false);
    }
  }, [postoId, mesIso]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { dados, carregando, erro, recarregar: carregar };
}

/**
 * As linhas do mês pela fonte ligada: a API com `VITE_API_PROPRIETARIO` (#100), o Supabase sem.
 * `null` quando a API falha — a tela mostra o erro em vez de cair no Supabase em silêncio.
 */
async function lerInsumos(postoId: number, periodo: Periodo): Promise<InsumosDoResumo | null> {
  if (!visaoDoProprietarioPelaApi()) return insumosDoSupabase(postoId, periodo);
  return insumosDaApi(postoId, periodo).match(
    (lidos) => lidos,
    () => null,
  );
}

/**
 * Dia anterior a uma data ISO local (`aaaa-mm-dd`), sem passar por fuso.
 *
 * @remarks `new Date(iso)` interpreta a string como UTC e, no GMT-3 do posto,
 *          devolve o dia errado. Somar em UTC e recortar a string mantém a data
 *          de calendário intacta — é a mesma armadilha que já jogou leituras
 *          inteiras um dia para trás.
 */
function diaAnterior(iso: string): string {
    return somarDias(deIsoLocal(iso), -1);
}

/**
 * Monta o bloco de estoque a partir das medições de tanque.
 *
 * @remarks A abertura é a **última medição física anterior ao início do
 *          período**, e o fechamento a última dentro dele. Produto sem medição
 *          de abertura fica de fora: sem ela o estoque teórico seria calculado
 *          a partir de zero e apontaria uma perda inteira que nunca existiu.
 */
function montarEstoque(
  tanques: readonly TanqueDoBanco[],
  medicoes: readonly MedicaoDoBanco[],
  nomeProduto: Map<number, string>,
  periodo: Periodo,
  compraPorProduto: Map<string, { litros: number; valor: number }>,
  venda: ResumoProdutos
): { resumo: ResumoEstoque | null; semAbertura: string[] } {
  if (tanques.length === 0) return { resumo: null, semAbertura: [] };

  if (medicoes.length === 0) {
    return { resumo: null, semAbertura: [...new Set(tanques.map((t) => produtoDoTanque(t, nomeProduto)))] };
  }

  const produtoDeTanque = new Map(tanques.map((t) => [t.id, produtoDoTanque(t, nomeProduto)]));

  const abertura = new Map<string, number>();
  const fechamento = new Map<string, number>();
  for (const m of medicoes) {
    const produto = produtoDeTanque.get(m.tanque_id);
    if (!produto || m.volume_fisico === null) continue;
    // As medições vêm em ordem crescente, então a última que cai em cada faixa
    // sobrescreve as anteriores e é a que vale.
    if (m.data < periodo.inicio) abertura.set(produto, num(m.volume_fisico));
    else fechamento.set(produto, num(m.volume_fisico));
  }

  const litrosVendidos = new Map(venda.produtos.map((p) => [p.produto, p.litros]));
  const produtos = [...new Set(produtoDeTanque.values())];
  const semAbertura = produtos.filter((p) => !abertura.has(p));
  const comAbertura = produtos.filter((p) => abertura.has(p));

  if (comAbertura.length === 0) return { resumo: null, semAbertura };

  return {
    resumo: resumoEstoque(
      comAbertura.map((produto) => ({
        produto,
        estoqueAnterior: abertura.get(produto) as number,
        litrosComprados: compraPorProduto.get(produto)?.litros ?? 0,
        litrosVendidos: litrosVendidos.get(produto) ?? 0,
        estoqueMedido: fechamento.get(produto) ?? null,
      }))
    ),
    semAbertura,
  };
}

function produtoDoTanque(tanque: TanqueDoBanco, nomeProduto: Map<number, string>): string {
  return tanque.combustivel_id !== null
    ? nomeProduto.get(tanque.combustivel_id) ?? 'Sem produto'
    : 'Sem produto';
}
