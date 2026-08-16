import React, { useActionState, useState } from 'react';
import { Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';

/**
 * Tela de entrada do painel.
 *
 * @remarks Entrar não é formalidade: o banco responde de forma diferente para
 *          quem está autenticado. Como visitante, o painel não enxerga
 *          `Fornecedor` nem `Compra` (a RLS devolve lista vazia, sem erro) e não
 *          consegue gravar em data histórica. Autenticado, essas permissões
 *          abrem — é o mesmo painel com acesso completo.
 *
 *          Visual: contenção, no molde de Linear/Vercel — coluna centrada,
 *          fundo claro quase liso, logo pequena, dois campos, um botão. A
 *          identidade do posto entra em detalhe, não em cenário: a faixa dupla
 *          amarela no topo da página (a faixa da estrada), a logo numa placa
 *          branca, vermelho da marca só no botão e no erro, azul do arco no
 *          foco. Cores em `marca-*` no `index.html`. Não segue o tema escuro:
 *          é uma tela só, iluminada.
 */
/** Onde o e-mail lembrado fica. Só o e-mail — senha nunca. */
const CHAVE_EMAIL = 'posto:email-lembrado';

const CLASSE_CAMPO =
  'block h-11 w-full rounded-lg border border-stone-300/90 bg-white px-3.5 text-[15px] text-asfalto shadow-[0_1px_2px_rgba(28,25,23,0.04)] ' +
  'placeholder:text-stone-400 focus:border-marca-azul focus:outline-none focus:ring-[3px] focus:ring-marca-azul/20 ' +
  'transition-[border-color,box-shadow] duration-150';

const CLASSE_ROTULO = 'mb-1.5 block text-[13px] font-medium text-stone-600';

const TelaLogin: React.FC = () => {
  const { entrar, seguirComoVisitante } = useAuth();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const emailLembrado = localStorage.getItem(CHAVE_EMAIL) ?? '';

  const [erro, acao, pendente] = useActionState<string | null, FormData>(
    async (_anterior, formData) => {
      const email = String(formData.get('email') ?? '').trim();
      const senha = String(formData.get('senha') ?? '');
      const lembrar = formData.get('lembrar') === 'on';

      if (!email) return 'Informe o e-mail.';
      if (!senha) return 'Informe a senha.';

      const falha = await entrar(email, senha);
      if (falha) return falha;

      // Só o e-mail é guardado, e só depois de o login dar certo. A senha fica a
      // cargo do gerenciador do navegador, que a criptografa — gravá-la aqui
      // seria deixar a chave do caixa em texto puro no computador da loja.
      if (lembrar) localStorage.setItem(CHAVE_EMAIL, email);
      else localStorage.removeItem(CHAVE_EMAIL);

      return null;
    },
    null
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f7f4ef] text-asfalto">
      {/* A faixa da estrada, no alto da página. */}
      <div aria-hidden="true" className="h-[7px] w-full border-y-2 border-marca-amarelo bg-transparent" />

      {/* Luz da manhã: um brilho âmbar quase imperceptível no alto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(245,194,57,0.16),rgba(245,194,57,0)_70%)]"
      />

      <main className="relative flex flex-1 flex-col items-center px-6 pb-10 pt-[9vh] md:pt-[13vh]">
        <div className="w-full max-w-[360px]">
          {/* A placa. */}
          <div className="mx-auto w-fit rounded-2xl bg-white px-5 py-3.5 shadow-[0_0_0_1px_rgba(28,25,23,0.06),0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.18)]">
            <img
              src="/marca-posto@2x.png"
              alt="Posto Providência"
              width={481}
              height={213}
              className="h-auto w-[196px] select-none"
              draggable={false}
            />
          </div>

          <h1 className="mt-8 text-center font-display text-[22px] font-bold tracking-tight text-asfalto text-balance">
            Entrar no painel
          </h1>

          <form action={acao} className="mt-7 flex flex-col gap-4" noValidate>
            <div>
              <label className={CLASSE_ROTULO} htmlFor="login-email">
                E-mail
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                spellCheck={false}
                placeholder="voce@postoprovidencia.com.br"
                defaultValue={emailLembrado}
                autoFocus={emailLembrado === ''}
                className={CLASSE_CAMPO}
                required
              />
            </div>

            <div>
              <label className={CLASSE_ROTULO} htmlFor="login-senha">
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-senha"
                  name="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  autoFocus={emailLembrado !== ''}
                  className={`${CLASSE_CAMPO} pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={mostrarSenha}
                  title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-stone-400 transition-colors duration-150 hover:text-asfalto focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-marca-azul/30"
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <label
              className="flex min-h-[40px] cursor-pointer select-none items-center gap-2.5 text-[14px] text-stone-600"
              htmlFor="login-lembrar"
            >
              <input
                id="login-lembrar"
                name="lembrar"
                type="checkbox"
                defaultChecked={emailLembrado !== ''}
                className="h-4 w-4 rounded border-stone-300 text-marca-vermelho focus:ring-[3px] focus:ring-marca-azul/20 focus:ring-offset-0"
              />
              Salvar meu acesso neste computador
            </label>

            {erro && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-marca-vermelho/25 bg-marca-vermelho/[0.06] px-3 py-2.5 text-[14px] text-marca-vermelho-escuro"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{erro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pendente}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-marca-vermelho px-4 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_1px_2px_rgba(28,25,23,0.12)] transition-[background-color,transform] duration-150 ease-out hover:bg-marca-vermelho-escuro focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-azul/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f7f4ef] active:scale-[0.99] disabled:cursor-progress disabled:opacity-70 disabled:active:scale-100"
            >
              {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {pendente ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-3 text-[12px] text-stone-400">
            <span className="h-px flex-1 bg-stone-300/70" />
            ou
            <span className="h-px flex-1 bg-stone-300/70" />
          </div>

          <button
            type="button"
            onClick={seguirComoVisitante}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg border border-stone-300/90 bg-white text-[15px] font-medium text-asfalto shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors duration-150 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-azul/30"
          >
            Continuar sem entrar
          </button>
          <p className="mt-3 text-center text-[12px] leading-relaxed text-stone-500 text-pretty">
            Sem entrar, o painel abre em modo visitante: mostra os números, mas não lê compras e
            fornecedores nem grava lançamento de data antiga.
          </p>
        </div>

        <footer className="mt-auto pt-12 text-center text-[12px] text-stone-400">
          © {new Date().getFullYear()} Posto Providência
        </footer>
      </main>
    </div>
  );
};

export default TelaLogin;
