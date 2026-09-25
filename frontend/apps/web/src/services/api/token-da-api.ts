/**
 * Onde o painel guarda o token do login da API (#102, Sanctum modo token).
 *
 * @remarks `localStorage` porque o token precisa sobreviver ao recarregar a página e o painel não
 *          usa cookie (a API pode estar em outro domínio). Toda leitura e escrita é protegida:
 *          navegador em modo privado ou com armazenamento bloqueado lança no acesso, e aí o
 *          painel simplesmente não lembra a sessão — pede o login de novo, nunca quebra.
 */
const CHAVE = 'posto.tokenDaApi';

export function lerTokenDaApi(): string | null {
    try {
        const token = localStorage.getItem(CHAVE);
        return token === null || token === '' ? null : token;
    } catch {
        return null;
    }
}

export function guardarTokenDaApi(token: string): void {
    try {
        localStorage.setItem(CHAVE, token);
    } catch {
        // Sem armazenamento a sessão vale só até recarregar a página — ver @remarks.
    }
}

export function esquecerTokenDaApi(): void {
    try {
        localStorage.removeItem(CHAVE);
    } catch {
        // Nada guardado para apagar.
    }
}
