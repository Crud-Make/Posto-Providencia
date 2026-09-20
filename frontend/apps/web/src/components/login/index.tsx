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
 *          Visual (26/08/2026, redesenho): a arte sangra a metade esquerda
 *          inteira sob um gradiente navy; o CTA ganhou o rótulo "Entrar", o
 *          vermelho ficou só no CTA/checkbox/foco, e "Jesus te ama" foi para
 *          o rodapé. O histórico abaixo é da versão anterior.
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
  'placeholder:text-slate-400 focus:border-marca-vermelho focus:outline-none focus:ring-[3px] focus:ring-marca-vermelho/25 ' +
  'transition-[border-color,box-shadow] duration-150';

const CLASSE_ROTULO = 'block text-[13px] font-medium text-slate-400';

const CLASSE_ICONE_CAMPO =
  'pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400';

/** Mensagem fora do fluxo de submit — o resultado do "Esqueceu a senha?". */
interface Aviso {
  readonly tom: 'ok' | 'erro';
  readonly texto: string;
}

/**
 * Mensagem do formulário: o erro do submit ou o aviso da recuperação de senha.
 * Só uma aparece por vez, e o erro do submit tem precedência.
 *
 * @remarks Vive fora de `TelaLogin` porque `erro || aviso?.tom === 'erro'` era
 *          avaliado em três lugares (role, cor e ícone) e sozinho respondia por
 *          boa parte do CCN 24 da tela, acima do teto de 20 do gate.
 */
const MensagemDoLogin: React.FC<{ erro: string | null; aviso: Aviso | null }> = ({ erro, aviso }) => {
  if (erro === null && aviso === null) return null;

  const ehErro = erro !== null || aviso?.tom === 'erro';

  return (
    <div
      role={ehErro ? 'alert' : 'status'}
      className={
        ehErro
          ? 'flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[14px] text-red-300'
          : 'flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-[14px] text-emerald-300'
      }
    >
      {ehErro ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{erro ?? aviso?.texto}</span>
    </div>
  );
};

/** Olho que alterna a visibilidade da senha. O rótulo serve a aria-label e title. */
const BotaoVerSenha: React.FC<{ visivel: boolean; aoAlternar: () => void }> = ({ visivel, aoAlternar }) => {
  const rotulo = visivel ? 'Ocultar senha' : 'Mostrar senha';

  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-label={rotulo}
      aria-pressed={visivel}
      title={rotulo}
      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-slate-400 transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-marca-vermelho/30"
    >
      {visivel ? (
        <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
    </button>
  );
};

/**
 * Miolo do botão de entrar: bomba + rótulo, ou spinner enquanto envia.
 *
 * @remarks Bomba + rótulo "Entrar" (26/08/2026): o botão só-bomba de 19/08 ficou
 *          sem nome visível. O glifo branco veio de ~/Downloads/bomba.webp, com o
 *          fundo vermelho removido.
 */
const ConteudoDoBotaoEntrar: React.FC<{ pendente: boolean }> = ({ pendente }) => {
  if (pendente) {
    return (
      <>
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        <span>Entrando...</span>
      </>
    );
  }

  return (
    <>
      <img
        src="/bomba-login.png"
        alt=""
        width={78}
        height={96}
        className="h-[22px] w-auto select-none transition-transform duration-150 group-hover:scale-110"
        draggable={false}
      />
      <span>Entrar</span>
    </>
  );
};

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
      {/* Zona da marca — a arte do posto sangrando a metade inteira, com um
          gradiente navy por cima para a paleta clara da arte não brigar com
          a UI escura (redesenho de 26/08/2026). */}
      {/* A arte sangra a metade inteira; um gradiente navy por cima segura a
          paleta clara. Precisa de arquivo com resolução real — 1120px
          esticado borra (26/08/2026). */}
      <section aria-hidden="true" className="relative hidden flex-1 overflow-hidden lg:block">
        <img
          src="/fundo-login.jpg"
          alt=""
          className="absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#020617_0%,rgba(2,6,23,0.85)_30%,rgba(2,6,23,0.35)_65%,rgba(2,6,23,0.10)_100%)]" />
      </section>

      {/* Painel do formulário — um passo tonal acima da zona da marca. */}
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 px-6 py-8 sm:px-12 lg:w-[480px] lg:border-l lg:border-white/10">
        <div className="w-full max-w-[372px]">
          <img
            src="/logo-login.jpg"
            alt="Posto Providência"
            width={306}
            height={306}
            className="mx-auto h-auto w-[112px] select-none rounded-xl"
            draggable={false}
          />

          <h1 className="mt-6 text-center font-display text-[26px] font-bold tracking-tight text-white text-balance">
            Posto Providência
          </h1>
          <p className="mt-1.5 text-center text-[14px] font-medium text-slate-400">Painel de Gestão</p>

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
                  autoComplete="email"
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
                  className="text-[13px] font-medium text-slate-400 transition-colors duration-150 hover:text-slate-300 hover:underline focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-marca-vermelho/40 disabled:opacity-60"
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
                <BotaoVerSenha visivel={mostrarSenha} aoAlternar={() => setMostrarSenha((v) => !v)} />
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
                className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-marca-vermelho focus:ring-[3px] focus:ring-marca-vermelho/25 focus:ring-offset-0"
              />
              Salvar meu acesso neste computador
            </label>

            <MensagemDoLogin erro={erro} aviso={aviso} />

            <button
              type="submit"
              disabled={pendente}
              title="Entrar no sistema"
              className="group mt-1 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-marca-vermelho px-4 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_1px_2px_rgba(0,0,0,0.4)] transition-[background-color,transform] duration-150 ease-out hover:bg-marca-vermelho-escuro focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-vermelho/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-[0.99] disabled:cursor-progress disabled:opacity-60 disabled:active:scale-100"
            >
              <ConteudoDoBotaoEntrar pendente={pendente} />
            </button>
          </form>
        </div>

        <footer className="flex flex-col items-center gap-1 pt-6 text-center text-[12px] text-slate-400">
          <p className="italic">Jesus te ama</p>
          <p className="font-medium">© {new Date().getFullYear()} Posto Providência</p>
        </footer>
      </main>
    </div>
  );
};

export default TelaLogin;
