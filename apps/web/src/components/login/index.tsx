import React, { useActionState, useState } from 'react';
import { Loader2, AlertTriangle, Eye, EyeOff, Mail, Lock } from 'lucide-react';
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
 *          Visual: layout do export do Stitch escolhido pelo dono em
 *          19/08/2026 ("Provident Security") — foto do posto cobrindo a tela,
 *          card translúcido à direita no desktop (centrado no mobile), campos
 *          com ícone, botão vermelho da marca. A logo é o tile do próprio
 *          export (`public/logo-login.jpg`), e o fundo é
 *          `public/fundo-login.jpg`, recortado do export (as URLs originais
 *          do Stitch expiram); trocar por uma foto real do posto no mesmo
 *          caminho melhora a tela sem tocar em código.
 *          Escura de propósito e sempre — não segue o
 *          alternador de tema, para casar com o painel, que é escuro.
 */
/**
 * Onde o acesso lembrado fica.
 *
 * @remarks Até 19/08/2026 a caixa dizia "Salvar meu acesso neste computador" e
 *          guardava **só o e-mail**: prometia acesso e entregava metade, o que
 *          fazia o dono concluir que o login estava quebrado quando a senha era
 *          pedida de novo. Hoje o rótulo voltou a esse texto — mas agora ele é
 *          verdade, porque e-mail **e** senha são guardados juntos.
 *
 *          **A senha fica em texto puro no `localStorage`** — qualquer extensão
 *          do navegador, script na página ou pessoa com acesso ao DevTools
 *          desta máquina consegue lê-la. O risco foi levantado e o dono decidiu
 *          assumi-lo em 19/08/2026: é o computador do posto, sob o controle
 *          dele, e o atrito de redigitar a cada entrada custava mais que o
 *          risco. Decisão dele, registrada aqui para não ser "consertada" por
 *          engano depois.
 *
 *          Marcar a caixa é opt-in: desmarcada, nada é gravado e o que houver
 *          é apagado.
 */
const CHAVE_EMAIL = 'posto:email-lembrado';
const CHAVE_SENHA = 'posto:senha-lembrada';

const CLASSE_CAMPO =
  'block h-12 w-full rounded-lg border border-slate-700 bg-slate-900/80 pl-11 pr-3.5 text-[15px] text-white ' +
  'placeholder:text-slate-500 focus:border-marca-azul focus:outline-none focus:ring-[3px] focus:ring-marca-azul/25 ' +
  'transition-[border-color,box-shadow] duration-150';

const CLASSE_ROTULO = 'mb-2 block text-[13px] font-medium text-slate-400';

const CLASSE_ICONE_CAMPO =
  'pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-500';

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      {/* A foto do posto, cobrindo a tela inteira — nítida e clara por escolha
          do dono (19/08/2026): sem desfoque e com véu mínimo, aceitando a
          granulação da ampliação (a arte original só existe em 275px). */}
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <img
          src="/fundo-login.jpg"
          alt=""
          className="h-full w-full select-none object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-slate-950/20" />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-10 lg:justify-end lg:px-[6vw]">
        {/* O card translúcido — vidro sobre a foto, como no export. */}
        <div className="w-full max-w-[440px] rounded-2xl border border-slate-200/15 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md sm:p-10">
          {/* O tile da logo, vindo do export do Stitch (public/logo-login.jpg).
              O fundo dele é quase o navy do card, então entra sem moldura. */}
          <img
            src="/logo-login.jpg"
            alt="Posto Providência"
            width={512}
            height={512}
            className="mx-auto h-auto w-[176px] select-none rounded-xl"
            draggable={false}
          />

          <h1 className="mt-7 text-center font-display text-[26px] font-bold tracking-tight text-white text-balance">
            Jesus te ama
          </h1>

          <form action={acao} className="mt-8 flex flex-col gap-5" noValidate>
            <div>
              <label className={CLASSE_ROTULO} htmlFor="login-email">
                E-mail
              </label>
              <div className="relative">
                <span className={CLASSE_ICONE_CAMPO} aria-hidden="true">
                  <Mail className="h-[18px] w-[18px]" />
                </span>
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
            </div>

            <div>
              <label className={CLASSE_ROTULO} htmlFor="login-senha">
                Senha
              </label>
              <div className="relative">
                <span className={CLASSE_ICONE_CAMPO} aria-hidden="true">
                  <Lock className="h-[18px] w-[18px]" />
                </span>
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
                className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-marca-vermelho focus:ring-[3px] focus:ring-marca-azul/25 focus:ring-offset-0"
              />
              Salvar meu acesso neste computador
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

            {/* Só a bomba, sem rótulo visível — pedido do dono em 19/08/2026.
                O nome do botão vive no aria-label; o glifo branco veio de
                ~/Downloads/bomba.webp, com o fundo vermelho removido para
                assentar no vermelho do botão. */}
            <button
              type="submit"
              disabled={pendente}
              aria-label={pendente ? 'Entrando…' : 'Entrar no sistema'}
              title="Entrar no sistema"
              className="group mt-1 inline-flex h-12 w-full items-center justify-center rounded-lg bg-marca-vermelho px-4 shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_1px_2px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 ease-out hover:bg-marca-vermelho-escuro focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-azul/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99] disabled:cursor-progress disabled:opacity-70 disabled:active:scale-100"
            >
              {pendente ? (
                <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
              ) : (
                <img
                  src="/bomba-login.png"
                  alt=""
                  width={78}
                  height={96}
                  className="h-7 w-auto select-none transition-transform duration-150 group-hover:scale-110"
                  draggable={false}
                />
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="relative z-10 pb-6 text-center text-[12px] font-medium text-slate-400">
        © {new Date().getFullYear()} Posto Providência
      </footer>
    </div>
  );
};

export default TelaLogin;
