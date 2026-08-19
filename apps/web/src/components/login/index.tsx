import React, { useActionState, useState } from 'react';
import { Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';

/**
 * Tela de entrada do painel.
 *
 * @remarks Entrar não é formalidade: o banco responde de forma diferente para
 *          quem está autenticado. Sem sessão o painel não enxerga `Fornecedor`
 *          nem `Compra` (a RLS devolve lista vazia, sem erro) e não consegue
 *          gravar em data histórica. É por isso que o "Continuar sem entrar"
 *          saiu em 19/08/2026: ele levava a um painel que mostrava número
 *          incompleto sem avisar que estava incompleto, e o lançamento de dia
 *          passado morria no erro cru da RLS. Sem senha não há meia-entrada.
 *
 *          Visual: contenção, no molde de Linear/Vercel — coluna centrada,
 *          fundo escuro quase liso, logo pequena, dois campos, um botão. A
 *          identidade do posto entra em detalhe, não em cenário: a faixa dupla
 *          amarela no topo (a faixa da estrada), a logo numa placa branca que
 *          é a única superfície clara da tela, vermelho da marca só no botão e
 *          no erro, azul do arco no foco. Cores em `marca-*` no `index.html`.
 *          Escura de propósito e sempre — não segue o alternador de tema, para
 *          casar com o painel, que é escuro.
 */
/**
 * Onde o acesso lembrado fica.
 *
 * @remarks Até 19/08/2026 a caixa dizia "Salvar meu acesso neste computador" e
 *          guardava **só o e-mail**: prometia acesso e entregava metade, o que
 *          fazia o dono concluir que o login estava quebrado quando a senha era
 *          pedida de novo.
 *
 *          Agora guarda os dois, e o rótulo diz isso. **A senha fica em texto
 *          puro no `localStorage`** — qualquer extensão do navegador, script na
 *          página ou pessoa com acesso ao DevTools desta máquina consegue lê-la.
 *          O risco foi levantado e o dono decidiu assumi-lo em 19/08/2026: é o
 *          computador do posto, sob o controle dele, e o atrito de redigitar a
 *          cada entrada custava mais que o risco. Decisão dele, registrada aqui
 *          para não ser "consertada" por engano depois.
 *
 *          Marcar a caixa é opt-in: desmarcada, nada é gravado e o que houver
 *          é apagado.
 */
const CHAVE_EMAIL = 'posto:email-lembrado';
const CHAVE_SENHA = 'posto:senha-lembrada';

const CLASSE_CAMPO =
  'block h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 text-[15px] text-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] ' +
  'placeholder:text-slate-500 focus:border-marca-azul focus:outline-none focus:ring-[3px] focus:ring-marca-azul/25 ' +
  'transition-[border-color,box-shadow] duration-150';

const CLASSE_ROTULO = 'mb-1.5 block text-[13px] font-medium text-slate-400';

const TelaLogin: React.FC = () => {
  const { entrar } = useAuth();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const emailLembrado = localStorage.getItem(CHAVE_EMAIL) ?? '';
  const senhaLembrada = localStorage.getItem(CHAVE_SENHA) ?? '';

  const [erro, acao, pendente] = useActionState<string | null, FormData>(
    async (_anterior, formData) => {
      const email = String(formData.get('email') ?? '').trim();
      const senha = String(formData.get('senha') ?? '');
      const lembrar = formData.get('lembrar') === 'on';

      if (!email) return 'Informe o e-mail.';
      if (!senha) return 'Informe a senha.';

      const falha = await entrar(email, senha);
      if (falha) return falha;

      // Gravado só depois de o login dar certo — senão a caixa guardaria uma
      // senha errada e o próximo acesso falharia sozinho. Ver o @remarks das
      // chaves sobre o texto puro: é decisão consciente, não descuido.
      if (lembrar) {
        localStorage.setItem(CHAVE_EMAIL, email);
        localStorage.setItem(CHAVE_SENHA, senha);
      } else {
        localStorage.removeItem(CHAVE_EMAIL);
        localStorage.removeItem(CHAVE_SENHA);
      }

      return null;
    },
    null
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-white">
      {/* A faixa da estrada, no alto da página. */}
      <div aria-hidden="true" className="h-[7px] w-full border-y-2 border-marca-amarelo bg-transparent" />

      {/* Luz dos postos da pista: um brilho âmbar frio no alto. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(245,194,57,0.10),rgba(245,194,57,0)_70%)]"
      />

      <main className="relative flex flex-1 flex-col items-center px-6 pb-10 pt-[9vh] md:pt-[13vh]">
        <div className="w-full max-w-[360px]">
          {/* A placa — única superfície clara da tela, porque a logo pede fundo branco. */}
          <div className="mx-auto w-fit rounded-2xl bg-white px-5 py-3.5 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_-12px_rgba(0,0,0,0.8)]">
            <img
              src="/marca-posto@2x.png"
              alt="Posto Providência"
              width={481}
              height={213}
              className="h-auto w-[196px] select-none"
              draggable={false}
            />
          </div>

          <h1 className="mt-8 text-center font-display text-[22px] font-bold tracking-tight text-white text-balance">
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
                  defaultValue={senhaLembrada}
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

            <label
              className="flex min-h-[40px] cursor-pointer select-none items-center gap-2.5 text-[14px] text-slate-400"
              htmlFor="login-lembrar"
            >
              <input
                id="login-lembrar"
                name="lembrar"
                type="checkbox"
                defaultChecked={emailLembrado !== '' || senhaLembrada !== ''}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-marca-vermelho focus:ring-[3px] focus:ring-marca-azul/25 focus:ring-offset-0"
              />
              Lembrar meu e-mail e senha neste computador
            </label>

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
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-marca-vermelho px-4 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_1px_2px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 ease-out hover:bg-marca-vermelho-escuro focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-azul/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99] disabled:cursor-progress disabled:opacity-70 disabled:active:scale-100"
            >
              {pendente && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {pendente ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <footer className="mt-auto pt-12 text-center text-[12px] text-slate-600">
          © {new Date().getFullYear()} Posto Providência
        </footer>
      </main>
    </div>
  );
};

export default TelaLogin;
