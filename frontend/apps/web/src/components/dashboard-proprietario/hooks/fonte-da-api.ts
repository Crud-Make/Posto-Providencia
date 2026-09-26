import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { custoMedioCompra, lucroCombustivel } from '@posto/utils';
import { intervaloDoMes, ehMesCorrente, type Periodo } from '../../../utils/periodo';
import type { ErroDaApi } from '../../../services/api/base';
import { lerFrentistasDaApi } from '../../../services/api/frentista.api';
import {
  lerPostosQueGereDaApi,
  lerProprietarioDaApi,
  type ProprietarioDaApi,
} from '../../../services/api/proprietario.api';
import type { Posto } from '../../../types/database/index';
import type { DadosDashboard, PostoSummary } from '../types';
import { consolidarDados, montarResumoDoDia, montarResumoDoMes, type VendaPeriodo } from './resumo-financeiro';

/**
 * A Visão do Proprietário lida da API Laravel (#100, `VITE_API_PROPRIETARIO`).
 *
 * @remarks Mesmo desenho do caminho Supabase — um resumo por posto, somados em `consolidarDados` —
 *          com três trocas de fonte:
 *          - a lista de postos é a do perfil (`GET /api/eu`), só os que o usuário GERE;
 *          - a RPC `get_dashboard_proprietario` e as leituras de `Despesa`/`Fechamento` viram
 *            `GET /api/postos/{posto}/proprietario`;
 *          - os frentistas vêm do catálogo da API.
 *          Nenhuma chamada ao Supabase: com o login pela API não existe sessão dele.
 */

/** Por que a Visão do Proprietário não abriu pela API. */
export type FalhaDaVisao = ErroDaApi | { readonly tipo: 'sem_posto' };

const VENDA_ZERADA: VendaPeriodo = { vendas: 0, litros: 0, lucroBruto: 0 };

/**
 * Venda e lucro bruto do período a partir dos insumos da API, com as funções canônicas.
 *
 * @remarks O que a RPC fazia em SQL (`Σ litros × (preco_litro − custo_do_mês)`), produto a
 *          produto: `custoMedioCompra` dá o custo do mês (a mesma razão `Σ valor ÷ Σ litros`
 *          da RPC) e `lucroCombustivel` sem despesa dá `receita − litros × custo`, com o preço
 *          médio tirado de `receita_a_preco_litro` (Σ litros × preco_litro, a receita que a RPC
 *          usava). `lucroCombustivel` quantiza por produto; a RPC somava sem arredondar — a
 *          diferença é de meio centavo por produto, no máximo.
 *
 *          **Divergência nomeada:** produto vendido sem compra no mês a RPC custeava pelo
 *          `preco_custo` do cadastro; aqui ele vai para `produtosSemCompra` e fica fora do
 *          lucro (DECISÃO 2, `docs/design/agregacao.md`). A tela mostra "não apurável".
 */
export function vendaDaApi(produtos: ProprietarioDaApi['produtos']): VendaPeriodo {
  const produtosSemCompra: string[] = [];
  let vendas = 0;
  let litros = 0;
  let lucroBruto = 0;

  for (const produto of produtos) {
    const litrosDoProduto = Number(produto.litros_vendidos);
    vendas += Number(produto.receita);
    litros += litrosDoProduto;
    if (litrosDoProduto <= 0) continue;

    const custoMedio = custoMedioCompra([
      { litros: Number(produto.compras.litros), valorTotal: Number(produto.compras.valor_total) },
    ]);
    if (custoMedio === null) {
      produtosSemCompra.push(produto.produto);
      continue;
    }
    lucroBruto += lucroCombustivel({
      litros: litrosDoProduto,
      precoVenda: Number(produto.receita_a_preco_litro) / litrosDoProduto,
      custoMedio,
      despesaOperacionalLitro: 0,
    });
  }

  return { vendas, litros, lucroBruto, produtosSemCompra };
}

/** O resumo de UM posto, como `processarPosto` faz no caminho Supabase. */
export function resumoDoPostoDaApi(
  posto: Posto,
  periodo: Periodo,
  hoje: string,
  mesCorrente: boolean
): ResultAsync<PostoSummary, ErroDaApi> {
  const doDia = mesCorrente
    ? lerProprietarioDaApi(posto.id, hoje, hoje).map((lido) => vendaDaApi(lido.produtos))
    : okAsync<VendaPeriodo, ErroDaApi>(VENDA_ZERADA);

  return ResultAsync.combine([
    lerFrentistasDaApi(posto.id),
    lerProprietarioDaApi(posto.id, periodo.inicio, periodo.fim),
    doDia,
  ] as const).map(([frentistas, doMes, vendaHoje]) => {
    // `lerFrentistasDaApi` já devolve só os ativos, como o `.filter((f) => f.ativo)` antigo.
    const frentistasAtivos = frentistas.length;
    const resumoMes = montarResumoDoMes(vendaDaApi(doMes.produtos), doMes.despesas.map(Number), frentistasAtivos);

    return {
      posto,
      hoje: montarResumoDoDia(vendaHoje, resumoMes.rateioPorLitro, resumoMes.temDespesa, frentistasAtivos),
      mes: resumoMes,
      despesasPendentes: doMes.despesas_pendentes.map(Number).reduce((acc, v) => acc + v, 0),
      ultimoFechamento: doMes.ultimo_fechamento,
    };
  });
}

/** A Visão do Proprietário inteira pela API: postos que o usuário gere → resumo de cada um → rede. */
export function carregarVisaoDaApi(mesSelecionado: string, hoje: string): ResultAsync<DadosDashboard, FalhaDaVisao> {
  const periodo = intervaloDoMes(mesSelecionado, hoje);
  const mesCorrente = ehMesCorrente(mesSelecionado, hoje);

  return lerPostosQueGereDaApi()
    .mapErr((erro): FalhaDaVisao => erro)
    .andThen((postos) => {
      const principal = postos[0];
      if (principal === undefined) return errAsync<DadosDashboard, FalhaDaVisao>({ tipo: 'sem_posto' });

      return ResultAsync.combine(postos.map((posto) => resumoDoPostoDaApi(posto, periodo, hoje, mesCorrente)))
        .mapErr((erro): FalhaDaVisao => erro)
        .map((resumos) => consolidarDados(resumos, principal, mesSelecionado, mesCorrente));
    });
}
