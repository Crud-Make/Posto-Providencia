import React, { useActionState, useState } from 'react';
import { Loader2, AlertTriangle, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';

/**
 * Tela de definir nova senha — o destino do link "Esqueceu a senha?".
 *
 * @remarks Só aparece quando o Supabase emite `PASSWORD_RECOVERY`, ou seja,
 *          quando o usuário chegou pelo link do e-mail de recuperação. A
 *          sessão já existe nesse momento; trocar a senha limpa o estado de
 *          recuperação e o gate do `App` segue direto para o painel.
 *          As classes de campo espelham as da tela de login — se mudar lá,
 *          mude aqui.
 */
const CLASSE_CAMPO =
  'block h-12 w-full rounded-lg border border-white/10 bg-slate-950/70 pl-11 pr-11 text-[15px] text-white ' +
  'placeholder:text-slate-500 focus:border-marca-azul focus:outline-none focus:ring-[3px] focus:ring-marca-azul/25 ' +
  'transition-[border-color,box-shadow] duration-150';

const CLASSE_ROTULO = 'mb-2 block text-[13px] font-medium text-slate-400';

const CLASSE_ICONE_CAMPO =
  'pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-500';

const TelaRedefinirSenha: React.FC = () => {
  const { definirNovaSenha } = useAuth();
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [erro, acao, pendente] = useActionState<string | null, FormData>(
    async (_anterior, formData) => {
      const senha = String(formData.get('senha') ?? '');
      const confirmacao = String(formData.get('confirmacao') ?? '');

      if (senha.length < 6) return 'A senha precisa de pelo menos 6 caracteres.';
      if (senha !== confirmacao) return 'As senhas não conferem.';

      return definirNovaSenha(senha);
    },
    null
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px] rounded-2xl border border-white/10 bg-slate-900 p-6 sm:p-10">
          <img
            src="/logo-login.jpg"
            alt="Posto Providência"
            width={306}
            height={306}
            className="mx-auto h-auto w-[112px] select-none rounded-xl"
            draggable={false}
          />

          <h1 className="mt-6 text-center font-display text-[22px] font-bold tracking-tight text-white text-balance">
            Definir nova senha
          </h1>
          <p className="mt-2 text-center text-[14px] leading-relaxed text-slate-400 text-pretty">
            Você chegou pelo link de recuperação. Escolha a nova senha do painel.
          </p>

          <form action={acao} className="mt-8 flex flex-col gap-5" noValidate>
            <div>
              <label className={CLASSE_ROTULO} htmlFor="nova-senha">
                Nova senha
              </label>
              <div className="relative">
                <span className={CLASSE_ICONE_CAMPO} aria-hidden="true">
                  <Lock className="h-[18px] w-[18px]" />
                </span>
                <input
                  id="nova-senha"
                  name="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Pelo menos 6 caracteres"
                  autoFocus
                  className={CLASSE_CAMPO}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={mostrarSenha}
                  title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-500 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-marca-azul/30"
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className={CLASSE_ROTULO} htmlFor="confirmacao-senha">
                Repita a nova senha
              </label>
              <div className="relative">
                <span className={CLASSE_ICONE_CAMPO} aria-hidden="true">
                  <Lock className="h-[18px] w-[18px]" />
                </span>
                <input
                  id="confirmacao-senha"
                  name="confirmacao"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="A mesma senha de novo"
                  className={CLASSE_CAMPO}
                  required
                />
              </div>
            </div>

            {erro && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{erro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pendente}
              className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-marca-vermelho px-4 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_1px_2px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 ease-out hover:bg-marca-vermelho-escuro focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-azul/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99] disabled:cursor-progress disabled:opacity-70 disabled:active:scale-100"
            >
              {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {pendente ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </form>
        </div>
      </main>

      <footer className="pb-6 text-center text-[12px] font-medium text-slate-500">
        © {new Date().getFullYear()} Posto Providência
      </footer>
    </div>
  );
};

export default TelaRedefinirSenha;
