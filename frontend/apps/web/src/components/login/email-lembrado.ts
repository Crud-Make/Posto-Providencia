/**
 * O e-mail da última entrada em cada posto, neste aparelho (pedido do dono, 27/09/2026): na volta, o
 * cartão do posto pede só a senha.
 *
 * @remarks Só o e-mail fica no navegador — nunca a senha, o token ou o posto ativo. Cada posto tem as
 *          próprias contas, então a chave é por posto. `localStorage` pode faltar (aba privada, site
 *          bloqueado): toda leitura e escrita é protegida e, sem ele, a tela pede o e-mail como antes.
 */
const chave = (postoId: number): string => `painel.email-do-posto.${postoId}`;

export function emailLembrado(postoId: number): string | null {
  try {
    const email = localStorage.getItem(chave(postoId));
    return email === null || email === '' ? null : email;
  } catch {
    return null;
  }
}

export function lembrarEmail(postoId: number, email: string): void {
  try {
    localStorage.setItem(chave(postoId), email);
  } catch {
    // Sem armazenamento, a próxima entrada pede o e-mail de novo.
  }
}

export function esquecerEmail(postoId: number): void {
  try {
    localStorage.removeItem(chave(postoId));
  } catch {
    // Nada guardado para esquecer.
  }
}
