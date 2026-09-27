/** O construtor que o Chrome/Edge expõem em `window.PasswordCredential` (fora do lib.dom do TS). */
type ConstrutorDeCredencial = new (dados: { id: string; password: string }) => Credential;

/**
 * Pede ao gerenciador de senhas do navegador que guarde o login — "Lembrar a senha" (27/09/2026).
 *
 * @remarks O app não guarda nada: quem guarda é o cofre do navegador, e o navegador pergunta antes.
 *          Sem a API (Firefox, Safari), devolve `false` e o navegador cai na própria heurística de
 *          oferecer salvar ao enviar o formulário. Nunca lança: guardar a senha não pode barrar a entrada.
 */
export async function lembrarSenhaNoNavegador(email: string, senha: string): Promise<boolean> {
  const Construtor = (window as { PasswordCredential?: ConstrutorDeCredencial }).PasswordCredential;
  if (Construtor === undefined || navigator.credentials === undefined) return false;
  try {
    await navigator.credentials.store(new Construtor({ id: email, password: senha }));
    return true;
  } catch {
    return false;
  }
}
