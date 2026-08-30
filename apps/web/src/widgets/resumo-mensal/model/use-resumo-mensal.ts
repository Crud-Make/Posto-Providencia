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
import { supabase } from '@/services/supabase';
import { compraService, tanqueService } from '@/services/api';
import { isSuccess } from '@/types/ui/response-types';
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

export interface Fornecedor {
  readonly id: number;
  readonly nome: string;
}

/** Lançamento de compra, como a tela coleta. */
export interface EntradaCompra {
  readonly combustivelId: number;
  readonly fornecedorId: number;
  readonly litros: number;
  readonly valor: number;
  readonly data: string;
}

/** Medição física de um tanque numa data. */
export interface EntradaMedicao {
  readonly tanqueId: number;
  readonly data: string;
  readonly volumeFisico: number;
}

interface RetornoHook {
  dados: DadosResumoMensal | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  /** @returns Mensagem de erro, ou `null` em caso de sucesso. */
  lancarCompra: (entrada: EntradaCompra) => Promise<string | null>;
  /** @returns Mensagem de erro, ou `null` em caso de sucesso. */
  salvarMedicao: (entrada: EntradaMedicao) => Promise<string | null>;
}

interface BicoDoBanco {
  id: number;
  numero: number;
  combustivel_id: number | null;
}

interface CombustivelDoBanco {
  id: number;
  nome: string;
  codigo: string | null;
}

interface LeituraDoBanco {
  data: string;
  bico_id: number;
  leitura_inicial: number | string | null;
  leitura_final: number | string | null;
  valor_total: number | string | null;
}

interface CompraDoBanco {
  combustivel_id: number | null;
  quantidade_litros: number | string | null;
  valor_total: number | string | null;
}

interface TanqueDoBanco {
  id: number;
  combustivel_id: number | null;
}

interface MedicaoDoBanco {
  tanque_id: number;
  data: string;
  volume_fisico: number | string | null;
}

const num = (valor: number | string | null | undefined): number => Number(valor ?? 0);

/**
 * Traduz a recusa da RLS para uma frase que o dono entenda.
 *
 * @remarks O painel roda como `anon` (não há login em `apps/web`), e a policy da
 *          tabela `Compra` só libera `authenticated`. O Postgres devolve
 *          "new row violates row-level security policy", que não diz nada a
 *          quem está tentando lançar uma nota. Sem esta tradução o dono vê
 *          jargão e conclui que o sistema está quebrado — quando é permissão.
 */
function mensagemDeErro(erro: string): string {
    const rls = /row-level security|42501|violates row-level/i.test(erro);
    return rls
        ? 'O painel não tem permissão para gravar esta tabela (a RLS recusou a escrita para esta conta). ' +
              'É preciso liberar a permissão no banco antes de lançar por aqui.'
        : erro;
}

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

      const [
        bicosRes,
        combustiveisRes,
        leiturasRes,
        comprasRes,
        despesasRes,
        tanquesRes,
        fornecedoresRes,
      ] = await Promise.all([
          supabase.from('Bico').select('id, numero, combustivel_id').eq('posto_id', postoId),
          supabase.from('Combustivel').select('id, nome, codigo').eq('posto_id', postoId),
          supabase
            .from('Leitura')
            .select('data, bico_id, leitura_inicial, leitura_final, valor_total')
            .eq('posto_id', postoId)
            .gte('data', periodo.inicio)
            .lte('data', periodo.fim),
          supabase
            .from('Compra')
            .select('combustivel_id, quantidade_litros, valor_total')
            .eq('posto_id', postoId)
            .gte('data', periodo.inicio)
            .lte('data', periodo.fim),
          supabase
            .from('Despesa')
            .select('valor')
            .eq('posto_id', postoId)
            .gte('data', periodo.inicio)
            .lte('data', periodo.fim),
          supabase.from('Tanque').select('id, combustivel_id').eq('posto_id', postoId),
          supabase.from('Fornecedor').select('id, nome').order('nome'),
        ]);

      const bicos = (bicosRes.data ?? []) as BicoDoBanco[];
      const combustiveis = (combustiveisRes.data ?? []) as CombustivelDoBanco[];
      const leituras = (leiturasRes.data ?? []) as LeituraDoBanco[];
      const compras = (comprasRes.data ?? []) as CompraDoBanco[];
      const despesas = (despesasRes.data ?? []) as { valor: number | string | null }[];
      const tanques = (tanquesRes.data ?? []) as TanqueDoBanco[];
      const fornecedores = (fornecedoresRes.data ?? []) as Fornecedor[];

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
      const estoque = await montarEstoque(
        tanques,
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

  /**
   * Lança uma compra de combustível.
   *
   * @remarks Vai pelo `compraService.create`, que já calcula o custo por litro e
   *          atualiza o custo médio ponderado do estoque. Escrever direto na
   *          tabela daqui criaria um segundo dono da mesma regra — foi assim que
   *          `valor_conferido` acabou duplicado em seis lugares.
   */
  const lancarCompra = useCallback(
    async (entrada: EntradaCompra): Promise<string | null> => {
      if (!postoId) return 'Nenhum posto selecionado.';
      if (entrada.litros <= 0) return 'Informe os litros comprados.';
      if (entrada.valor <= 0) return 'Informe o valor da compra.';

      const resposta = await compraService.create({
        posto_id: postoId,
        combustivel_id: entrada.combustivelId,
        fornecedor_id: entrada.fornecedorId,
        data: entrada.data,
        quantidade_litros: entrada.litros,
        valor_total: entrada.valor,
        // O service recalcula e sobrescreve este campo — é ele quem manda. Vai
        // preenchido porque o tipo `Insert` da tabela o exige.
        custo_por_litro: entrada.valor / entrada.litros,
      });

      if (!isSuccess(resposta)) return mensagemDeErro(resposta.error);

      await carregar();
      return null;
    },
    [postoId, carregar]
  );

  /**
   * Salva a medição física de um tanque numa data (upsert por tanque + data).
   *
   * @remarks É a régua do tanque, digitada por gente — não sai de cálculo
   *          nenhum. Salvar na data de abertura alimenta o `Ano passado.` do
   *          período; na data de fim, o `Estoque Tanque.` que revela a perda.
   */
  const salvarMedicao = useCallback(
    async (entrada: EntradaMedicao): Promise<string | null> => {
      if (entrada.volumeFisico < 0) return 'O volume medido não pode ser negativo.';

      const resposta = await tanqueService.saveHistory({
        tanque_id: entrada.tanqueId,
        data: entrada.data,
        volume_fisico: entrada.volumeFisico,
      });

      if (!isSuccess(resposta)) return mensagemDeErro(resposta.error);

      await carregar();
      return null;
    },
    [carregar]
  );

  return { dados, carregando, erro, recarregar: carregar, lancarCompra, salvarMedicao };
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
async function montarEstoque(
  tanques: TanqueDoBanco[],
  nomeProduto: Map<number, string>,
  periodo: Periodo,
  compraPorProduto: Map<string, { litros: number; valor: number }>,
  venda: ResumoProdutos
): Promise<{ resumo: ResumoEstoque | null; semAbertura: string[] }> {
  if (tanques.length === 0) return { resumo: null, semAbertura: [] };

  const { data } = await supabase
    .from('HistoricoTanque')
    .select('tanque_id, data, volume_fisico')
    .in(
      'tanque_id',
      tanques.map((t) => t.id)
    )
    .lte('data', periodo.fim)
    .order('data', { ascending: true });

  const medicoes = (data ?? []) as MedicaoDoBanco[];
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
