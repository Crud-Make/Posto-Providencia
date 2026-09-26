import type { ResultAsync } from 'neverthrow';
import { paraExcecao, RecusaDaApi, type ErroDeApi } from '@frentista/shared/api';
import { esquecerSessao, sessaoDoAparelho, sessaoGuardada, type SessaoDoFrentista } from '@frentista/entities/sessao-do-frentista';
import { buscarFrentistasParaEscolherPelaApi, buscarPerfilPelaApi, salvarFotoPelaApi, type Frentista } from '@frentista/entities/frentista';
import { buscarEnviosDoDiaPelaApi, buscarHistoricoPelaApi, type EnvioDoDia, type ItemDoHistorico } from '@frentista/entities/fechamento-frentista';
import {
  buscarProdutosPelaApi,
  buscarVendasDeHojePelaApi,
  registrarCarrinhoPelaApi,
  type ItemDoCarrinho,
  type Produto,
  type VendaDeHoje,
} from '@frentista/entities/produto';
import { buscarMedicoesDoDiaPelaApi, buscarTanquesPelaApi, salvarMedicaoPelaApi, type MedicaoDoDia, type Tanque } from '@frentista/entities/tanque';

/**
 * A metade "pela API" da fachada `services/api.ts` (#101, fatia 2): com `VITE_API_PWA=1`, cada
 * método da fachada delega para cá e o PWA não fala com o Supabase para nada.
 *
 * @remarks O MESMO contrato da fachada (promise que lança), para as telas não mudarem. Quem é o
 *          frentista sai da SESSÃO do aparelho (o token do PIN), nunca de parâmetro:
 *          - dado PESSOAL (histórico, foto, vendas do frentista) exige a sessão DESTE frentista;
 *          - dado do posto (tanques, produtos, envios do dia) aceita a sessão de quem entrou no aparelho.
 *          Sem sessão, lança `RecusaDaApi` 401 SEM ir à rede; um 401 da API apaga a sessão guardada.
 */

const SEM_SESSAO = 'Toque no seu nome e digite o PIN para continuar.';

const desembrulhar = <T,>(resultado: ResultAsync<T, ErroDeApi>): Promise<T> =>
  resultado.match(
    (valor) => valor,
    (erro) => { throw paraExcecao(erro); },
  );

/** Roda `chamada` com o token da sessão; sem sessão, `Err` 401 sem rede; 401 da API esquece a sessão. */
function comSessao<T>(sessao: SessaoDoFrentista | null, chamada: (token: string) => ResultAsync<T, ErroDeApi>): Promise<T> {
  if (sessao === null) return Promise.reject(new RecusaDaApi(401, 'sem_sessao', SEM_SESSAO));
  return desembrulhar(chamada(sessao.token).mapErr((erro) => {
    if (erro.tipo === 'api' && erro.status === 401) esquecerSessao();
    return erro;
  }));
}

/** A foto do frentista que tem sessão no aparelho, posta na lista (que chega sem foto nenhuma). */
async function comFotoDaSessao(postoId: number, lista: Frentista[]): Promise<Frentista[]> {
  const sessao = sessaoDoAparelho();
  if (sessao === null || !lista.some((f) => f.id === sessao.frentista.id)) return lista;
  const perfil = await buscarPerfilPelaApi(postoId, sessao.token).match((p) => p, () => null);
  return perfil === null ? lista : lista.map((f) => (f.id === perfil.id ? { ...f, foto: perfil.foto } : f));
}

export const apiPelaApi = {
  async getFrentistas(postoId: number): Promise<Frentista[]> {
    return comFotoDaSessao(postoId, await desembrulhar(buscarFrentistasParaEscolherPelaApi(postoId)));
  },

  salvarFotoFrentista(postoId: number, frentistaId: number, foto: string | null): Promise<void> {
    return comSessao(sessaoGuardada(frentistaId), (token) => salvarFotoPelaApi(postoId, token, foto));
  },

  getHistoricoFrentista(postoId: number, frentistaId: number): Promise<ItemDoHistorico[]> {
    return comSessao(sessaoGuardada(frentistaId), (token) => buscarHistoricoPelaApi(postoId, token));
  },

  getEnviosDoDia(postoId: number, dataStr: string): Promise<EnvioDoDia[]> {
    return comSessao(sessaoDoAparelho(), (token) => buscarEnviosDoDiaPelaApi(postoId, token, dataStr));
  },

  getProdutos(postoId: number): Promise<Produto[]> {
    return comSessao(sessaoDoAparelho(), (token) => buscarProdutosPelaApi(postoId, token));
  },

  getVendasProdutoHoje(postoId: number, frentistaId: number): Promise<VendaDeHoje[]> {
    return comSessao(sessaoGuardada(frentistaId), (token) => buscarVendasDeHojePelaApi(postoId, token));
  },

  registrarCarrinho(postoId: number, frentistaId: number, chave: string, itens: readonly ItemDoCarrinho[]): Promise<void> {
    return comSessao(sessaoGuardada(frentistaId), (token) => registrarCarrinhoPelaApi(postoId, token, chave, itens));
  },

  getTanques(postoId: number): Promise<Tanque[]> {
    return comSessao(sessaoDoAparelho(), (token) => buscarTanquesPelaApi(postoId, token));
  },

  getMedicoesDoDia(postoId: number, dataStr: string): Promise<MedicaoDoDia[]> {
    return comSessao(sessaoDoAparelho(), (token) => buscarMedicoesDoDiaPelaApi(postoId, token, dataStr));
  },

  salvarMedicaoTanque(postoId: number, tanqueId: number, dataStr: string, volumeFisico: number): Promise<void> {
    return comSessao(sessaoDoAparelho(), (token) => salvarMedicaoPelaApi(postoId, token, tanqueId, dataStr, volumeFisico));
  },
};
