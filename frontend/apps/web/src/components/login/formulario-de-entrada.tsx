import React, { useActionState, useRef, useState } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { lembrarSenhaNoNavegador } from './lembrar-senha';

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

interface Props {
  /** Recusa que vem de fora do submit (ex.: a conta não é do posto escolhido). */
  erroExterno: string | null;
}

/**
 * E-mail e senha da tela de entrada. O app não guarda nada no navegador (regra do dono, 27/09/2026): a
 * caixa "Salvar meu acesso neste computador", que guardava e-mail e senha em texto puro, saiu.
 *
 * @remarks "Lembrar a senha" (27/09/2026) entrega o login ao gerenciador de senhas do navegador, e só
 *          depois de a entrada dar certo — senha errada não vai para o cofre. Na próxima vez o
 *          navegador preenche; o posto continua sendo escolhido no cartão.
 */
const FormularioDeEntrada: React.FC<Props> = ({ erroExterno }) => {
  const { entrar, pedirRecuperacaoSenha } = useAuth();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviandoRecuperacao, setEnviandoRecuperacao] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const [erro, acao, pendente] = useActionState<string | null, FormData>(async (_anterior, formData) => {
    setAviso(null);
    const email = String(formData.get('email') ?? '').trim();
    const senha = String(formData.get('senha') ?? '');
    if (!email) return 'Informe o e-mail.';
    if (!senha) return 'Informe a senha.';
    const falha = await entrar(email, senha);
    if (falha === null && formData.get('lembrar') === 'sim') void lembrarSenhaNoNavegador(email, senha);
    return falha;
  }, null);

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
      falha !== null
        ? { tom: 'erro', texto: falha }
        : { tom: 'ok', texto: `Enviamos o link de recuperação para ${email}. Confira a caixa de entrada.` }
    );
  };

  return (
      <form action={acao} className="flex flex-col gap-5" noValidate>
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
              autoComplete="username"
              inputMode="email"
              spellCheck={false}
              placeholder="voce@postoprovidencia.com.br"
              autoFocus
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
              className={`${CLASSE_CAMPO} pr-11`}
              style={ESTILO_CAMPO}
              required
            />
            <BotaoVerSenha visivel={mostrarSenha} aoAlternar={() => setMostrarSenha((v) => !v)} />
          </div>
        </div>

        <label className="-mt-1 flex cursor-pointer items-center gap-2.5 text-[14px]" style={{ color: 'var(--texto-medio)' }}>
          <input type="checkbox" name="lembrar" value="sim" className="h-4 w-4 accent-[#A30E19]" />
          Lembrar a senha neste navegador
        </label>

        <MensagemDoLogin erro={erro ?? erroExterno} aviso={aviso} />

        <button
          type="submit"
          disabled={pendente}
          title="Entrar no sistema"
          className="group mt-1 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-lg bg-[#A30E19] px-4 text-[15px] font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-[#8A0B15] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#042992]/50 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-progress disabled:opacity-60 disabled:active:scale-100"
        >
          <ConteudoDoBotaoEntrar pendente={pendente} />
        </button>
      </form>
  );
};

export default FormularioDeEntrada;
