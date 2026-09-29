import { errAsync, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, enviarParaApi, type ErroDaApi } from './base';
import { esquecerTokenDaApi, guardarTokenDaApi } from './token-da-api';

/**
 * Sessão do login próprio da API (#102): entrar, saber quem está logado, sair.
 *
 * @remarks O perfil traz os postos em que a pessoa pode entrar — é a lista da tela "em qual posto
 *          você quer entrar?". A API decide essa lista (vínculo em `UsuarioPosto`, ou todos para
 *          ADMIN); o painel só mostra. Cada posto da rede vê só o próprio dado.
 */
export const postoDoUsuarioSchema = z.object({
    id: z.number().int().positive(),
    nome: z.string(),
    papel: z.string(),
});

export const perfilDaApiSchema = z.object({
    id: z.number().int().positive(),
    nome: z.string(),
    email: z.string(),
    role: z.string(),
    postos: z.array(postoDoUsuarioSchema),
});

export type PostoDoUsuario = z.infer<typeof postoDoUsuarioSchema>;
export type PerfilDaApi = z.infer<typeof perfilDaApiSchema>;

const respostaDoLogin = z.object({ token: z.string().min(1), usuario: perfilDaApiSchema });
const respostaDoPerfil = z.object({ usuario: perfilDaApiSchema });

/** Entra, guarda o token e devolve o perfil. */
export function entrarNaApi(email: string, senha: string): ResultAsync<PerfilDaApi, ErroDaApi> {
    return enviarParaApi('/api/login', 'POST', { email, senha, dispositivo: 'painel' }, respostaDoLogin).map((resposta) => {
        guardarTokenDaApi(resposta.token);
        return resposta.usuario;
    });
}

/** Quem está logado com o token guardado. Token recusado (401) é esquecido na hora. */
export function perfilDaSessao(): ResultAsync<PerfilDaApi, ErroDaApi> {
    return buscarNaApi('/api/eu', respostaDoPerfil)
        .map((resposta) => resposta.usuario)
        .orElse((erro) => {
            if (erro.tipo === 'http' && erro.status === 401) {
                esquecerTokenDaApi();
            }
            return errAsync(erro);
        });
}

/** Encerra a sessão na API e esquece o token — mesmo se a API não responder. */
export function sairDaApi(): ResultAsync<null, ErroDaApi> {
    return enviarParaApi('/api/sair', 'POST', {}, z.null()).map((nada) => {
        esquecerTokenDaApi();
        return nada;
    }).orElse((erro) => {
        esquecerTokenDaApi();
        return errAsync(erro);
    });
}

const postoDaRedeSchema = z.object({
    id: z.number().int().positive(),
    nome: z.string(),
    // Caminho versionado da fachada (`/api/postos/{id}/foto?v=…`) ou `null` — a lista não carrega a
    // imagem, só o endereço (27/09/2026). `.default(null)`: API anterior à foto não manda o campo.
    foto: z.string().nullable().default(null),
});
export type PostoDaRede = z.infer<typeof postoDaRedeSchema>;

/**
 * Os postos ativos da rede, para os cartões da tela de entrada — rota PÚBLICA (a mesma do PWA do
 * frentista), porque a escolha do posto vem antes da senha. Saem `id`, `nome` e o caminho da foto.
 */
export function postosDaRede(): ResultAsync<PostoDaRede[], ErroDaApi> {
    return buscarNaApi('/api/postos', z.object({ data: z.array(postoDaRedeSchema) })).map((resposta) => resposta.data);
}

/** A frase que a tela de login mostra para cada falha. */
export function mensagemDoLogin(erro: ErroDaApi): string {
    if (erro.tipo === 'http' && erro.status === 401) return 'E-mail ou senha incorretos.';
    if (erro.tipo === 'http' && erro.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
    if (erro.tipo === 'rede') return 'Não foi possível falar com o servidor. Confira a internet.';
    return 'Não foi possível entrar agora. Tente de novo.';
}
