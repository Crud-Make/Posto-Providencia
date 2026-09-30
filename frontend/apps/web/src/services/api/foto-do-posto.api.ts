import { z } from 'zod';
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { enviarParaApi, enviarParaApiComToken, urlDaApi, type ErroDaApi } from './base';
import type { PerfilDaApi } from './sessao.api';

/**
 * A foto da fachada do posto (27/09/2026). Quem troca é o gerente ou o admin daquele posto; a
 * lista pública de postos traz só o caminho versionado da imagem, e a imagem vem de
 * `GET /api/postos/{id}/foto`, com cache longo (o `?v=` muda quando a foto muda).
 */

/** Limite do servidor para o data URL (`CHECK` no banco e `max` no FormRequest). */
export const TAMANHO_MAXIMO_DA_FOTO = 300_000;

const respostaDaTroca = z.object({ data: z.object({ foto: z.string().nullable() }) });

/** Grava (ou, com `null`, remove) a foto do posto. Devolve o novo caminho versionado. */
export function trocarFotoDoPosto(postoId: number, foto: string | null): ResultAsync<string | null, ErroDaApi> {
    return enviarParaApi(`/api/postos/${postoId}/foto`, 'PUT', { foto }, respostaDaTroca).map((r) => r.data.foto);
}

/** O caminho que a API devolve vira endereço completo — a API mora em outro domínio que o painel. */
export function enderecoDaFoto(caminho: string | null): string | null {
    if (caminho === null) return null;
    const base = urlDaApi();
    return base === null ? null : `${base}${caminho}`;
}

/**
 * Quem pode trocar a foto do posto: o admin da rede, ou quem é GERENTE/ADMIN daquele posto — a mesma
 * regra do `gerir` do servidor (PostoPolicy), que é quem decide de verdade.
 */
export function podeTrocarFotoDoPosto(usuario: PerfilDaApi | null, postoId: number): boolean {
  if (usuario === null) return false;
  if (usuario.role.toUpperCase() === 'ADMIN') return true;
  // O papel no posto vem em minúsculas da API (`gerente`, enum PapelNoPosto); o `role` da conta, em
  // maiúsculas. Compara sem caixa para não depender de nenhum dos dois.
  const papel = usuario.postos.find((p) => p.id === postoId)?.papel.toUpperCase();
  return papel === 'GERENTE' || papel === 'ADMIN';
}

const respostaDoLogin = z.object({ token: z.string().min(1) });

/** Encerra o token da troca; falhar aqui não desfaz a troca nem muda o que a tela conta. */
function encerrar(token: string): ResultAsync<null, never> {
    return enviarParaApiComToken('/api/sair', 'POST', {}, z.unknown(), token)
        .map(() => null)
        .orElse(() => okAsync(null));
}

/**
 * Troca a foto pelo cartão da tela de entrada, sem entrar no painel (pedido do dono, 27/09/2026): entra
 * com o usuário e a senha do gerente SÓ para esta troca, grava a foto e encerra o token — dando certo ou
 * não. Quem decide se a conta pode é o servidor (`gerir` do posto): conta de outro posto leva 403.
 *
 * @remarks `login` é o nome de usuário do cartão daquele posto (30/09/2026); com "@", é e-mail.
 */
export function trocarFotoComSenha(
    postoId: number,
    login: string,
    senha: string,
    foto: string,
): ResultAsync<string | null, ErroDaApi> {
    const quem = login.includes('@') ? { email: login } : { posto_id: postoId, usuario: login };
    return enviarParaApiComToken('/api/login', 'POST', { ...quem, senha, dispositivo: 'foto-do-posto' }, respostaDoLogin, null).andThen(
        ({ token }) =>
            enviarParaApiComToken(`/api/postos/${postoId}/foto`, 'PUT', { foto }, respostaDaTroca, token)
                .andThen((r) => encerrar(token).map(() => r.data.foto))
                .orElse((erro) => encerrar(token).andThen(() => errAsync(erro))),
    );
}

/** A frase da janela de troca para cada falha. */
export function mensagemDaTrocaDeFoto(erro: ErroDaApi): string {
    const status = erro.tipo === 'http' || erro.tipo === 'recusado' ? erro.status : null;
    if (status === 401) return 'Usuário ou senha incorretos.';
    if (status === 403) return 'Esta conta não pode trocar a foto deste posto.';
    if (status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
    if (status === 422) return 'O servidor não aceitou essa foto. Tente outra imagem.';
    if (erro.tipo === 'rede') return 'Não foi possível falar com o servidor. Confira a internet.';
    return 'Não foi possível trocar a foto agora. Tente de novo.';
}
