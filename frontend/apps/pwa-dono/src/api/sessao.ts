/**
 * A sessão do app do dono na API Laravel: o token e o aviso de que ele morreu.
 *
 * @remarks **Só na memória da página** (regra do dono, 27/09/2026: "o navegador não pode salvar
 *          nada"). Fechar o app ou recarregar a página encerra a sessão, e a tela de entrada —
 *          cartão do posto + usuário e senha — aparece de novo. É o mesmo desenho do painel
 *          (`apps/web/src/services/api/token-da-api.ts`), copiado e não importado: app não importa
 *          outro app (FSD-5).
 */
let tokenAtual: string | null = null;

type OuvinteDaSessao = (mensagem: string) => void;
const ouvintes = new Set<OuvinteDaSessao>();

export const MENSAGEM_SESSAO_ACABOU = 'Sua sessão acabou. Entre de novo.';

export function lerToken(): string | null {
    return tokenAtual;
}

export function guardarToken(token: string): void {
    tokenAtual = token === '' ? null : token;
}

export function esquecerToken(): void {
    tokenAtual = null;
}

/**
 * Avisa quem está ouvindo que a sessão acabou (401 numa chamada que levava token) e esquece o
 * token. É por aqui que o App volta para a tela de entrada, esteja a pessoa em que tela estiver.
 */
export function perderSessao(mensagem: string = MENSAGEM_SESSAO_ACABOU): void {
    tokenAtual = null;
    ouvintes.forEach((ouvinte) => ouvinte(mensagem));
}

/** Ouve a perda da sessão. Devolve a função que para de ouvir (para o `useEffect`). */
export function aoPerderSessao(ouvinte: OuvinteDaSessao): () => void {
    ouvintes.add(ouvinte);
    return () => {
        ouvintes.delete(ouvinte);
    };
}
