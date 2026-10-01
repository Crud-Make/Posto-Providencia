/**
 * O login da última entrada em cada posto, neste aparelho: na volta, o cartão pede só a senha.
 *
 * @remarks Mesma regra do painel (`apps/web/src/components/login/login-lembrado.ts`): só o
 *          USUÁRIO (ou o e-mail da conta que só tem e-mail) fica no navegador — nunca a senha, o
 *          token ou o posto ativo. As contas são separadas por posto, então a chave também é.
 *          `localStorage` pode faltar (aba privada, site bloqueado): toda leitura e escrita é
 *          protegida e, sem ele, a tela pede o usuário de novo.
 */
const chave = (postoId: number): string => `pwa-dono.login-do-posto.${postoId}`;

export function loginLembrado(postoId: number): string | null {
    try {
        const login = localStorage.getItem(chave(postoId));
        return login === null || login === '' ? null : login;
    } catch {
        return null;
    }
}

export function lembrarLogin(postoId: number, login: string): void {
    try {
        localStorage.setItem(chave(postoId), login);
    } catch {
        // Sem armazenamento, a próxima entrada pede o usuário de novo.
    }
}

export function esquecerLogin(postoId: number): void {
    try {
        localStorage.removeItem(chave(postoId));
    } catch {
        // Nada guardado para esquecer.
    }
}
