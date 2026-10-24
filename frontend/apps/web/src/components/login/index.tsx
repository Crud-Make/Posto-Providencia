import React, { useActionState, useRef, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff, Mail, Lock, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { useTheme } from '../../contexts/useTheme';
import { fraseDoDia, variaveisDoTema } from './escolha-de-posto-estilo';

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
 *          Visual (27/09/2026, redesenho com a logo nova da rede): o mesmo estilo da tela
 *          "Escolha o posto" — faixa azul/vermelho/dourado da logo, logo nova numa placa
 *          branca (o arquivo é JPG com fundo branco), a foto do posto com a frase do dia à
 *          esquerda, e o tema claro/escuro do painel (`useTheme`) com botão de alternar.
 *          O que ficou das versões anteriores: "Jesus te ama" no rodapé (pedido do dono) e a
 *          bomba no botão de entrar.
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
  'block h-12 w-full rounded-lg border pl-11 pr-3.5 text-[15px] placeholder:opacity-60 ' +
  'focus:border-marca-vermelho focus:outline-none focus:ring-[3px] focus:ring-marca-vermelho/25 ' +
  'transition-[border-color,box-shadow] duration-150';

/** Cores do campo pelo tema (as variáveis vêm de `variaveisDoTema`, na raiz da tela). */
const ESTILO_CAMPO = { background: 'var(--fundo)', borderColor: 'var(--borda-cartao)', color: 'var(--texto)' } as const;

const CLASSE_ROTULO = 'block text-[13px] font-semibold';

const CLASSE_ICONE_CAMPO =
  'pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center opacity-70';

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
  const { theme, toggleTheme } = useTheme();
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
    <div className="relative flex min-h-screen" style={{ ...variaveisDoTema(theme), background: 'var(--fundo)', color: 'var(--texto)' }}>
      <div className="absolute inset-x-0 top-0 z-10 grid h-1.5 grid-cols-3" aria-hidden="true">
        <div style={{ background: '#042992' }} />
        <div style={{ background: '#A30E19' }} />
        <div style={{ background: '#E5BE41' }} />
      </div>

      {/* A foto do posto com a frase do dia — só em tela larga. */}
      <section className="relative hidden flex-1 overflow-hidden lg:block">
        <img src="/fundo-login.jpg" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center" draggable={false} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0A0F1C] via-[#0A0F1C]/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-14">
          <div className="h-1 w-12 rounded-sm bg-[#E5BE41]" aria-hidden="true" />
          <p className="max-w-xl font-display text-4xl font-semibold leading-tight text-white">{fraseDoDia(new Date())}</p>
        </div>
      </section>

      <main className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-10 sm:px-12 lg:w-[480px] lg:border-l" style={{ background: 'var(--painel)', borderColor: 'var(--linha)' }}>
        <div className="w-full max-w-[372px]">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-xl bg-white px-3 py-2">
              <img src="/logo-providencia.png" alt="Posto Providência" className="h-auto w-48 select-none" draggable={false} />
            </div>
            <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'} className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--borda-botao)', background: 'var(--botao)', color: 'var(--texto-medio)' }}>
              {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>

          <h1 className="mt-10 font-display text-[28px] font-bold tracking-tight">Entrar no painel</h1>
          <p className="mt-1.5 text-[15px]" style={{ color: 'var(--texto-suave)' }}>Rede Providência · Painel de Gestão</p>

          <form action={acao} className="mt-8 flex flex-col gap-5" noValidate>
            <div>
              <label className={`${CLASSE_ROTULO} mb-2`} htmlFor="login-email" style={{ color: 'var(--texto-medio)' }}>
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
                  style={ESTILO_CAMPO}
                  required
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className={CLASSE_ROTULO} htmlFor="login-senha" style={{ color: 'var(--texto-medio)' }}>
                  Senha
                </label>
                <button
                  type="button"
                  onClick={aoEsquecerSenha}
                  disabled={enviandoRecuperacao}
                  className="text-[13px] font-semibold hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marca-vermelho/40 disabled:opacity-60"
                  style={{ color: 'var(--acento)' }}
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
                  style={ESTILO_CAMPO}
                  required
                />
                <BotaoVerSenha visivel={mostrarSenha} aoAlternar={() => setMostrarSenha((v) => !v)} />
              </div>
            </div>

            <label className="flex min-h-[40px] cursor-pointer select-none items-center gap-2.5 text-[14px]" htmlFor="login-lembrar" style={{ color: 'var(--texto-medio)' }}>
              <input
                id="login-lembrar"
                name="lembrar"
                type="checkbox"
                defaultChecked={emailLembrado !== '' || senhaLembrada !== ''}
                className="h-5 w-5 rounded text-marca-vermelho focus:ring-[3px] focus:ring-marca-vermelho/25 focus:ring-offset-0"
              />
              Salvar meu acesso neste computador
            </label>

            <MensagemDoLogin erro={erro} aviso={aviso} />

            <button
              type="submit"
              disabled={pendente}
              title="Entrar no sistema"
              className="group mt-1 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-[#A30E19] px-4 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#8A0B15] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#042992]/50 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-progress disabled:opacity-60 disabled:active:scale-100"
            >
              <ConteudoDoBotaoEntrar pendente={pendente} />
            </button>
          </form>
        </div>

        <footer className="flex flex-col items-center gap-1 pt-10 text-center text-[12px]" style={{ color: 'var(--texto-suave)' }}>
          <p className="italic">Jesus te ama</p>
          <p className="font-medium">© {new Date().getFullYear()} Rede Providência. Todos os direitos reservados.</p>
        </footer>
      </main>
    </div>
  );
};

export default TelaLogin;
