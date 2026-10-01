/**
 * A entrada do app do dono (#102): os postos da rede, o login no posto escolhido e a saída.
 *
 * @remarks Mesmo desenho do painel (PR #176, "entrar com usuário no cartão do posto"): a pessoa
 *          escolhe o CARTÃO do posto e entra com a conta DAQUELE posto — as contas são separadas
 *          por posto (decisão do dono, 27/09/2026). O `POST /api/login` aceita dois corpos:
 *
 *          - `{ posto_id, usuario, senha }` — o nome de usuário ("elias") vale dentro do posto;
 *          - `{ email, senha }` — texto com "@" continua entrando como e-mail (a conta do ADMIN).
 *
 *          A resposta traz `usuario.postos`, a lista de postos que a conta alcança. Conta que não
 *          alcança o posto escolhido é RECUSADA aqui: o token que acabou de nascer é encerrado na
 *          API e esquecido, e a tela diz "Esta conta não é do <posto>." — o mesmo do painel.
 */
import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, chamarApi, type ErroDaApi } from './cliente';
import { esquecerToken, guardarToken, lerToken } from './sessao';

const postoDaRedeSchema = z.object({
    id: z.number().int().positive(),
    nome: z.string(),
    // Caminho da fachada na API (`/api/postos/{id}/foto?v=…`) ou `null`. API anterior à foto não manda.
    foto: z.string().nullable().default(null),
});
export type PostoDaRede = z.infer<typeof postoDaRedeSchema>;

const perfilSchema = z.object({
    id: z.number().int().positive(),
    nome: z.string(),
    email: z.string(),
    role: z.string(),
    postos: z.array(z.object({ id: z.number().int().positive(), nome: z.string(), papel: z.string() })),
});
export type PerfilDaApi = z.infer<typeof perfilSchema>;

const respostaDoLogin = z.object({ token: z.string().min(1), usuario: perfilSchema });

/** Por que a entrada falhou: um erro da API, ou a conta que não é do posto escolhido. */
export type FalhaDaEntrada = ErroDaApi | { readonly tipo: 'conta_de_outro_posto'; readonly posto: string };

/** Os postos ativos da rede, para os cartões — rota PÚBLICA, a escolha vem antes da senha. */
export function postosDaRede(): ResultAsync<PostoDaRede[], ErroDaApi> {
    return buscarNaApi('/api/postos', z.object({ data: z.array(postoDaRedeSchema) })).map((r) => r.data);
}

/** O corpo do login: com "@" é e-mail; sem, é o usuário do posto do cartão. */
export function corpoDoLogin(postoId: number, login: string, senha: string): Record<string, string | number> {
    return login.includes('@')
        ? { email: login, senha, dispositivo: 'pwa-dono' }
        : { posto_id: postoId, usuario: login, senha, dispositivo: 'pwa-dono' };
}

/**
 * Entra no posto escolhido. Só guarda o token quando a conta é DAQUELE posto.
 *
 * @remarks O login vai com `token: null` de propósito: um token velho na memória não pode viajar
 *          no pedido de outro login, e um 401 aqui é senha errada, não sessão perdida.
 */
export function entrarNoPosto(posto: PostoDaRede, login: string, senha: string): ResultAsync<PerfilDaApi, FalhaDaEntrada> {
    return chamarApi('/api/login', { metodo: 'POST', corpo: corpoDoLogin(posto.id, login, senha), token: null }, respostaDoLogin)
        .mapErr((erro): FalhaDaEntrada => erro)
        .andThen((resposta) => {
            if (resposta.usuario.postos.some((p) => p.id === posto.id)) {
                guardarToken(resposta.token);
                return okAsync<PerfilDaApi, FalhaDaEntrada>(resposta.usuario);
            }
            // A conta existe, mas não é deste posto: encerra o token que acabou de nascer.
            return chamarApi('/api/sair', { metodo: 'POST', corpo: {}, token: resposta.token }, z.null())
                .orElse(() => okAsync(null))
                .andThen(() => errAsync<PerfilDaApi, FalhaDaEntrada>({ tipo: 'conta_de_outro_posto', posto: posto.nome }));
        });
}

/** Encerra a sessão na API e esquece o token — mesmo se a API não responder. */
export function sair(): ResultAsync<null, ErroDaApi> {
    const token = lerToken();
    esquecerToken();
    if (token === null) return okAsync(null);
    return chamarApi('/api/sair', { metodo: 'POST', corpo: {}, token }, z.null());
}

/** A frase que a tela de entrada mostra para cada falha. */
export function mensagemDaEntrada(falha: FalhaDaEntrada): string {
    if (falha.tipo === 'conta_de_outro_posto') return `Esta conta não é do ${falha.posto}.`;
    if (falha.tipo === 'http' && falha.status === 401) return 'Usuário ou senha incorretos.';
    if (falha.tipo === 'http' && falha.status === 429) return 'Muitas tentativas. Espere um minuto e tente de novo.';
    if (falha.tipo === 'recusado') return 'Confira o usuário e a senha.';
    if (falha.tipo === 'rede') return 'Não foi possível falar com o servidor. Confira a internet.';
    if (falha.tipo === 'sem_api') return 'O endereço do servidor não foi configurado (VITE_API_URL).';
    return 'Não foi possível entrar agora. Tente de novo.';
}

/** Endereço completo da foto do posto, ou `null`. */
export function enderecoDaFoto(caminho: string | null, base: string | null): string | null {
    if (caminho === null || base === null) return null;
    return /^https?:\/\//.test(caminho) ? caminho : `${base}${caminho}`;
}
