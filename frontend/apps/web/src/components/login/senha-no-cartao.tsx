import React, { useActionState, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { lembrarLogin, loginLembrado } from './login-lembrado';
import { lembrarSenhaNoNavegador } from './lembrar-senha';

const CLASSE_CAMPO =
  'block h-11 w-full min-w-0 rounded-lg border-2 border-[#2A9C98] bg-[var(--campo)] px-3 text-[16px] text-[var(--texto)] placeholder:text-[var(--texto-suave)] ' +
  'focus:outline-none focus:ring-[3px] focus:ring-[#2A9C98]/30';

interface Props {
  postoId: number;
  nome: string;
  /** Recusa que vem de fora do envio (a conta não é do posto escolhido). */
  erroExterno: string | null;
}

/**
 * A entrada dentro do cartão do posto escolhido (desenho aprovado pelo dono, 28/09/2026): só a senha e
 * a seta. O usuário vem lembrado daquele posto; aparelho que ainda não entrou nele pede o usuário uma
 * vez. Desde 30/09 é o NOME DE USUÁRIO ("elias"), não o e-mail — e vale dentro do posto do cartão: as
 * contas são separadas por posto. Texto com "@" continua entrando como e-mail (a conta do ADMIN).
 *
 * @remarks Deu certo: o usuário fica lembrado (só ele, por posto) e o login vai ao gerenciador de senhas
 *          do navegador, que pergunta antes de guardar — a caixa "Lembrar a senha" saiu com o desenho.
 */
const SenhaNoCartao: React.FC<Props> = ({ postoId, nome, erroExterno }) => {
  const { entrar } = useAuth();
  const [lembrado] = useState(() => loginLembrado(postoId));

  const [erro, acao, pendente] = useActionState<string | null, FormData>(async (_anterior, dados) => {
    const login = (lembrado ?? String(dados.get('usuario') ?? '')).trim();
    const senha = String(dados.get('senha') ?? '');
    if (login === '') return 'Informe o usuário.';
    if (senha === '') return 'Informe a senha.';
    const falha = await entrar(login, senha, postoId);
    if (falha === null) {
      lembrarLogin(postoId, login);
      void lembrarSenhaNoNavegador(login, senha);
    }
    return falha;
  }, null);

  const mensagem = erro ?? erroExterno;

  return (
    <form action={acao} noValidate className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-3">
      {lembrado === null ? (
        <input
          name="usuario"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Usuário"
          aria-label={`Usuário do ${nome}`}
          className={CLASSE_CAMPO}
          autoFocus
        />
      ) : (
        <input name="usuario" type="text" autoComplete="username" value={lembrado} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
      )}
      <div className="relative">
        <input
          name="senha"
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          aria-label={`Senha do ${nome}`}
          autoFocus={lembrado !== null}
          className={`${CLASSE_CAMPO} pr-14`}
        />
        <button
          type="submit"
          disabled={pendente}
          aria-label={`Entrar no ${nome}`}
          title="Entrar"
          className="absolute right-1 top-1 flex h-9 w-11 items-center justify-center rounded-md bg-[#A30E19] text-white transition-colors hover:bg-[#8A0B15] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#042992]/50 disabled:cursor-progress disabled:opacity-60"
        >
          {pendente ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>
      {mensagem !== null && (
        <p role="alert" className="text-[13px] font-medium text-[var(--acento)]">
          {mensagem}
        </p>
      )}
    </form>
  );
};

export default SenhaNoCartao;
