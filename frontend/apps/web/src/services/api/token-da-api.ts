/**
 * Onde o painel guarda o token do login da API (#102, Sanctum modo token).
 *
 * @remarks Só na memória da página (regra do dono, 27/09/2026: "o navegador não pode salvar nada").
 *          Recarregar a página ou fechar a aba encerra a sessão, e a tela de entrada — escolha do
 *          posto + e-mail e senha — aparece de novo. Antes ficava no `localStorage`, e quem entrou
 *          uma vez caía direto no último posto sem passar pela escolha.
 */
let tokenAtual: string | null = null;

export function lerTokenDaApi(): string | null {
    return tokenAtual;
}

export function guardarTokenDaApi(token: string): void {
    tokenAtual = token === '' ? null : token;
}

export function esquecerTokenDaApi(): void {
    tokenAtual = null;
}
