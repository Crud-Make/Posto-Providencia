/**
 * O login da última entrada em cada posto, neste aparelho (pedido do dono, 27/09/2026): na volta, o
 * cartão do posto pede só a senha. Desde 30/09 o que fica guardado é o NOME DE USUÁRIO do cartão
 * ("elias") — ou o e-mail, para a conta que só tem e-mail (o ADMIN, por exemplo).
 *
 * @remarks Só o login fica no navegador — nunca a senha, o token ou o posto ativo. Cada posto tem as
 *          próprias contas, então a chave é por posto. `localStorage` pode faltar (aba privada, site
 *          bloqueado): toda leitura e escrita é protegida e, sem ele, a tela pede o usuário como antes.
 *          A chave mudou de `painel.email-do-posto.*` para `painel.login-do-posto.*`: o aparelho que
 *          tinha o e-mail guardado pede o usuário uma vez.
 */
const chave = (postoId: number): string => `painel.login-do-posto.${postoId}`;

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
