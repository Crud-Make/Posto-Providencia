import type { ResultAsync } from 'neverthrow';
import { paraExcecao, type ErroDeApi } from '@frentista/shared/api';
import {
  buscarFrentistasAtivos,
  marcarPresencaDoFrentista,
  salvarFotoDoFrentista,
  type Frentista,
} from '@frentista/entities/frentista';
import {
  avisarDonoDoEnvio,
  buscarEnviosDoDia,
  buscarHistoricoDoFrentista,
  buscarOuCriarFechamento,
  consolidarFechamento,
  enviarFechamentoFrentista,
  type EnvioDoDia,
  type FechamentoFrentistaPayload,
  type ItemDoHistorico,
  type LinhaCriada,
} from '@frentista/entities/fechamento-frentista';
import {
  buscarProdutosAtivos,
  buscarVendasDeHoje,
  registrarVenda,
  type NovaVenda,
  type Produto,
  type VendaCriada,
  type VendaDeHoje,
} from '@frentista/entities/produto';
import { buscarMedicoesDoDia, buscarTanques, salvarMedicao, type MedicaoDoDia, type Tanque } from '@frentista/entities/tanque';
import type { ConsolidacaoDoDia } from '@posto/api-core';

/**
 * Fachada do strangler (P8 da refatoração FSD do pwa, 22/09/2026).
 *
 * @remarks As consultas moraram aqui até o P8; agora moram nas entities (`frentista`,
 *          `fechamento-frentista`, `produto`, `tanque`), devolvendo `ResultAsync` e validando o
 *          dado com Zod. Este objeto continua com os MESMOS nomes e o MESMO contrato de antes
 *          (promise que lança) porque `App.tsx`, as telas e o `vi.mock('./services/api')` do
 *          `App.test.tsx` dependem dele. Cada método só delega e desembrulha o Result. Some
 *          quando o último consumidor passar a usar a entity direto.
 *
 *          Os cinco delegados do encerrante (`getBicos`, `aquecerEncerrante`, `lerEncerrante`,
 *          `getUltimasLeiturasPorBico`, `salvarLeituras`) saíram: a aba Encerrante foi para o
 *          `apps/pwa-dono` e nenhum arquivo deste app os chamava (grep em 22/09, ok do dono).
 */

/**
 * O contrato antigo: `Ok` resolve, `Err` rejeita com a mesma exceção de antes — `Error(mensagem
 * do banco)`, ou a própria rejeição do client, sem embrulho (ver `paraExcecao`).
 */
const desembrulhar = <T,>(resultado: ResultAsync<T, ErroDeApi>): Promise<T> =>
  resultado.match(
    (valor) => valor,
    (erro) => { throw paraExcecao(erro); },
  );

export const api = {
  /** Busca Frentistas ativos do Posto */
  getFrentistas(postoId: number): Promise<Frentista[] | null> {
    return desembrulhar(buscarFrentistasAtivos(postoId));
  },

  /** Grava o avatar do frentista. O porquê de a garantia ser só de tela está na entity. */
  salvarFotoFrentista(frentistaId: number, foto: string | null): Promise<void> {
    return desembrulhar(salvarFotoDoFrentista(frentistaId, foto));
  },

  /** Busca ou cria o Fechamento consolidado do dia/turno */
  getOrCreateFechamento(postoId: number, dataStr: string, turnoId: number, usuarioId: number = 1): Promise<number> {
    return desembrulhar(buscarOuCriarFechamento(postoId, dataStr, turnoId, usuarioId));
  },

  /** Envia o fechamento individual do frentista (e reconsolida o pai, na entity). */
  submitFrentistaClosing(payload: FechamentoFrentistaPayload): Promise<LinhaCriada | null> {
    return desembrulhar(enviarFechamentoFrentista(payload));
  },

  /**
   * Avisa o celular do dono que este fechamento chegou.
   *
   * @remarks **Nunca lança, e isso é o ponto.** O que importa é o fechamento
   *          ter sido gravado; o aviso é cortesia. Se uma falha de
   *          notificação derrubasse o "enviado com sucesso", o frentista
   *          mandaria tudo de novo e criaria envio em dobro — trocando um
   *          aviso perdido por um problema de dinheiro.
   */
  async avisarDono(fechamentoFrentistaId: number): Promise<void> {
    await avisarDonoDoEnvio(fechamentoFrentistaId).match(
      () => undefined,
      (erro) => {
        console.error('aviso ao dono não saiu:', erro.tipo === 'rede' ? erro.causa : erro.mensagem);
      },
    );
  },

  /** Delegado a `@posto/api-core`, pela entity. */
  consolidarFechamento(fechamentoId: number): Promise<ConsolidacaoDoDia | null> {
    return desembrulhar(consolidarFechamento(fechamentoId));
  },

  /** Busca histórico de fechamentos de um frentista */
  getHistoricoFrentista(frentistaId: number): Promise<ItemDoHistorico[]> {
    return desembrulhar(buscarHistoricoDoFrentista(frentistaId));
  },

  /** Envios já feitos no dia, de todos os frentistas (filtra pela data do pai). */
  getEnviosDoDia(postoId: number, dataStr: string): Promise<EnvioDoDia[]> {
    return desembrulhar(buscarEnviosDoDia(postoId, dataStr));
  },

  /** Busca produtos ativos do posto */
  getProdutos(postoId: number): Promise<Produto[]> {
    return desembrulhar(buscarProdutosAtivos(postoId));
  },

  /** Registra uma venda de produto pelo frentista */
  registrarVendaProduto(payload: NovaVenda): Promise<VendaCriada | null> {
    return desembrulhar(registrarVenda(payload));
  },

  /**
   * Sinal de vida: registra que o app está aberto com este frentista selecionado.
   *
   * @remarks Falha em silêncio: presença é conveniência, e um erro do banco aqui não pode
   *          atrapalhar o frentista que está tentando fechar o caixa. Rejeição de rede sobe
   *          como antes (quem chama faz `void`).
   */
  async marcarPresenca(frentistaId: number, postoId: number): Promise<void> {
    await marcarPresencaDoFrentista(frentistaId, postoId).match(
      () => undefined,
      (erro) => {
        if (erro.tipo === 'rede') throw paraExcecao(erro);
        console.warn('[presenca] sinal não registrado:', erro.mensagem);
      },
    );
  },

  /** Tanques do posto com o combustível — a lista da tela de régua (#74). */
  getTanques(postoId: number): Promise<Tanque[]> {
    return desembrulhar(buscarTanques(postoId));
  },

  /** Medições de régua já gravadas no dia — para avisar que reenvio substitui. */
  getMedicoesDoDia(dataStr: string): Promise<MedicaoDoDia[]> {
    return desembrulhar(buscarMedicoesDoDia(dataStr));
  },

  /** Grava a medição de régua (upsert por tanque+dia) e confere a gravação (anti-RLS). */
  salvarMedicaoTanque(tanqueId: number, dataStr: string, volumeFisico: number): Promise<void> {
    return desembrulhar(salvarMedicao(tanqueId, dataStr, volumeFisico));
  },

  /** Busca vendas de produtos do dia por frentista (recorte de meia-noite local, na entity). */
  getVendasProdutoHoje(frentistaId: number): Promise<VendaDeHoje[]> {
    return desembrulhar(buscarVendasDeHoje(frentistaId));
  },
};
