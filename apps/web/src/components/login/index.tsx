import React, { useActionState, useRef, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
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
 *          Visual (19/08/2026, terceira iteração com o dono): split-screen
 *          tonal. A arte do posto só existe em 275px — esticada na tela
 *          inteira ela granula, então ela vira um QUADRO na zona da marca, no
 *          tamanho em que é nítida, com a faixa dupla amarela da estrada como
 *          assinatura embaixo. O formulário vive num painel um passo mais
 *          claro (slate-900 sobre slate-950; inputs mais escuros que o painel,
 *          porque input é encaixe). Do export do Stitch ficaram o tile da logo
 *          (`public/logo-login.jpg`), o "Jesus te ama" e o card de proporção
 *          440px; o botão é só a bomba, pedido do dono. Escura de propósito e
 *          sempre — não segue o alternador de tema, para casar com o painel.
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
  'block h-12 w-full rounded-lg border border-white/10 bg-slate-950/70 pl-11 pr-3.5 text-[15px] text-white ' +
  'placeholder:text-slate-500 focus:border-marca-azul focus:outline-none focus:ring-[3px] focus:ring-marca-azul/25 ' +
  'transition-[border-color,box-shadow] duration-150';

const CLASSE_ROTULO = 'block text-[13px] font-medium text-slate-400';

const CLASSE_ICONE_CAMPO =
  'pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-500';

/** Mensagem fora do fluxo de submit — o resultado do "Esqueceu a senha?". */
interface Aviso {
  readonly tom: 'ok' | 'erro';
  readonly texto: string;
}

const TelaLogin: React.FC = () => {
  const { entrar, pedirRecuperacaoSenha } = useAuth();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const emailLembrado = localStorage.getItem(CHAVE_EMAIL) ?? '';
  const senhaLembrada = localStorage.getItem(CHAVE_SENHA) ?? '';

  const [erro, acao, pendente] = useActionState<string | null, FormData>(
    async (_anterior, formData) => {
      setAviso(null);
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

  const aoEsquecerSenha = async () => {
    const email = emailRef.current?.value.trim() ?? '';
    if (!email) {
      setAviso({ tom: 'erro', texto: 'Preencha o e-mail acima para receber o link de recuperação.' });
      emailRef.current?.focus();
      return;
    }
    setEnviandoRecuperacao(true);
    const falha = await pedirRecuperacaoSenha(email);
    setEnviandoRecuperacao(false);
    setAviso(
      falha
        ? { tom: 'erro', texto: falha }
        : { tom: 'ok', texto: `Enviamos o link de recuperação para ${email}. Confira a caixa de entrada.` }
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Zona da marca — a arte do posto como quadro, no tamanho em que é
          nítida, sobre o navy mais fundo da tela. */}
      <section
        aria-hidden="true"
        className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden p-12 lg:flex"
      >
        {/* Luz âmbar dos postes da pista, bem baixa. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(245,194,57,0.07),rgba(245,194,57,0)_70%)]" />

        <figure className="relative w-[min(40vw,560px)]">
          <img
            src="/fundo-login.jpg"
            alt=""
            width={1120}
            height={745}
            className="h-auto w-full select-none rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_24px_48px_-24px_rgba(0,0,0,0.9)]"
            draggable={false}
          />
          {/* A faixa dupla da estrada — assinatura da tela desde a versão anterior. */}
          <div className="mx-auto mt-8 h-[7px] w-24 border-y-2 border-marca-amarelo" />
          <figcaption className="mt-4 text-center text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Painel de gestão
          </figcaption>
        </figure>
      </section>

      {/* Painel do formulário — um passo tonal acima da zona da marca. */}
      <main className="flex w-full flex-col bg-slate-900 px-6 py-8 sm:px-12 lg:w-[480px] lg:border-l lg:border-white/10">
        <div className="mx-auto my-auto w-full max-w-[356px] py-6">
          <img
            src="/logo-login.jpg"
            alt="Posto Providência"
            width={306}
            height={306}
            className="mx-auto h-auto w-[132px] select-none rounded-xl"
            draggable={false}
          />

          <h1 className="mt-6 text-center font-display text-[24px] font-bold tracking-tight text-white text-balance">
            Jesus te ama
          </h1>

          <form action={acao} className="mt-8 flex flex-col gap-5" noValidate>
            <div>
              <label className={`${CLASSE_ROTULO} mb-2`} htmlFor="login-email">
                E-mail
              </label>
              <div className="relative">
                <span className={CLASSE_ICONE_CAMPO} aria-hidden="true">
                  <Mail className="h-[18px] w-[18px]" />
                </span>
                <input
                  ref={(el) => {
                    emailRef.current = el;
                  }}
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
              <div className="mb-2 flex items-center justify-between">
                <label className={CLASSE_ROTULO} htmlFor="login-senha">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={aoEsquecerSenha}
                  disabled={enviandoRecuperacao}
                  className="text-[13px] font-medium text-red-300 transition-colors duration-150 hover:text-red-200 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-marca-azul/40 disabled:opacity-60"
                >
                  {enviandoRecuperacao ? 'Enviando…' : 'Esqueceu a senha?'}
                </button>
              </div>
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

            {(erro || aviso) && (
              <div
                role={erro || aviso?.tom === 'erro' ? 'alert' : 'status'}
                className={
                  erro || aviso?.tom === 'erro'
                    ? 'flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300'
                    : 'flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[14px] text-emerald-300'
                }
              >
                {erro || aviso?.tom === 'erro' ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{erro ?? aviso?.texto}</span>
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
              className="group mt-1 inline-flex h-12 w-full items-center justify-center rounded-lg bg-marca-vermelho px-4 shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_1px_2px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 ease-out hover:bg-marca-vermelho-escuro focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-azul/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.99] disabled:cursor-progress disabled:opacity-70 disabled:active:scale-100"
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

        <footer className="pt-6 text-center text-[12px] font-medium text-slate-500">
          © {new Date().getFullYear()} Posto Providência
        </footer>
      </main>
    </div>
  );
};

export default TelaLogin;
