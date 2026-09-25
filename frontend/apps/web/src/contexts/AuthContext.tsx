import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { loginPelaApiLigado } from '../services/api/base';
import type { PerfilDaApi } from '../services/api/sessao.api';
import { useAuthDaApi } from './useAuthDaApi';

/**
 * Estado de autenticação do painel.
 *
 * @remarks Até 16/08/2026 o `apps/web` não autenticava: acessava o Supabase
 *          apenas com a chave anônima. Isso não era detalhe de conveniência —
 *          as policies de RLS distinguem `anon` de `authenticated`, e como
 *          visitante o painel **não lê** `Fornecedor` nem `Compra`, **não grava**
 *          compra, e não escreve em data fora da janela de 7 dias. Leitura
 *          barrada por RLS volta como lista vazia sem erro, então a tela
 *          concluía "não há nada cadastrado" quando na verdade não tinha
 *          permissão de ver.
 *
 *          O modo visitante existiu entre 16 e 19/08/2026 como escada para a
 *          apresentação não travar sem a senha à mão. Saiu porque era pior que
 *          a trava: `anon` lê metade das tabelas em silêncio e não grava data
 *          histórica, então o painel mostrava número incompleto sem dizer que
 *          era incompleto, e o replay falhava com o erro cru da RLS. Sem sessão
 *          agora só existe a tela de login.
 */
export interface EstadoAutenticacao {
  readonly sessao: Session | null;
  /**
   * Quem está logado e em quais postos pode entrar — só no login pela API (#102). No login pelo
   * Supabase é `null`, e a lista de postos continua vindo do banco.
   */
  readonly usuario: PerfilDaApi | null;
  readonly carregando: boolean;
  /** `true` quando há sessão — o banco passa a responder como `authenticated`. */
  readonly autenticado: boolean;
  /**
   * `true` quando o usuário chegou pelo link de recuperação do e-mail
   * (evento `PASSWORD_RECOVERY`). Nesse estado o app mostra a tela de
   * definir nova senha em vez do painel, mesmo já havendo sessão.
   */
  readonly recuperandoSenha: boolean;
  entrar: (email: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  /** Dispara o e-mail de recuperação. Devolve mensagem de erro ou `null`. */
  pedirRecuperacaoSenha: (email: string) => Promise<string | null>;
  /** Troca a senha da sessão de recuperação. Devolve mensagem de erro ou `null`. */
  definirNovaSenha: (senha: string) => Promise<string | null>;
}

const AuthContext = createContext<EstadoAutenticacao | null>(null);

/**
 * Escolhe o emissor da sessão pela flag `VITE_API_LOGIN` (ver `loginPelaApiLigado`). A flag é
 * fixa durante a vida da página, então cada provedor chama os próprios hooks sempre na mesma ordem.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  loginPelaApiLigado() ? <ProvedorDaApi>{children}</ProvedorDaApi> : <ProvedorSupabase>{children}</ProvedorSupabase>;

const ProvedorDaApi: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const valor = useAuthDaApi();
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

const ProvedorSupabase: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });

    // Cleanup obrigatório: subscrição viva depois do desmonte vaza canal e
    // estoura o limite de conexão do projeto (CLAUDE.md §5).
    const { data: assinatura } = supabase.auth.onAuthStateChange((evento, novaSessao) => {
      // O link do e-mail de recuperação abre o app já com sessão; sem este
      // sinal o gate mostraria o painel direto e a troca de senha nunca
      // aconteceria.
      if (evento === 'PASSWORD_RECOVERY') setRecuperandoSenha(true);
      setSessao(novaSessao);
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (!error) return null;

    // A mensagem do Supabase vem em inglês e genérica de propósito (não revela
    // se o e-mail existe). Traduzir mantém a mesma discrição, em pt-BR.
    return /invalid login credentials/i.test(error.message)
      ? 'E-mail ou senha incorretos.'
      : error.message;
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const pedirRecuperacaoSenha = useCallback(async (email: string): Promise<string | null> => {
    // O redirect volta para a origem do próprio app; a URL precisa estar na
    // allowlist de redirecionamento do projeto Supabase (Auth → URL Config).
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (!error) return null;
    return /rate limit|security purposes/i.test(error.message)
      ? 'Aguarde um pouco antes de pedir outro e-mail de recuperação.'
      : error.message;
  }, []);

  const definirNovaSenha = useCallback(async (senha: string): Promise<string | null> => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (!error) {
      setRecuperandoSenha(false);
      return null;
    }
    if (/at least 6|weak/i.test(error.message)) {
      return 'A senha precisa de pelo menos 6 caracteres.';
    }
    if (/should be different/i.test(error.message)) {
      return 'A nova senha precisa ser diferente da atual.';
    }
    return error.message;
  }, []);

  // Sem React Compiler neste projeto: a memoização é manual e necessária, senão
  // todo consumidor do contexto re-renderiza a cada render do provider.
  const valor = useMemo<EstadoAutenticacao>(
    () => ({
      sessao,
      usuario: null,
      carregando,
      autenticado: sessao !== null,
      recuperandoSenha,
      entrar,
      sair,
      pedirRecuperacaoSenha,
      definirNovaSenha,
    }),
    [sessao, carregando, recuperandoSenha, entrar, sair, pedirRecuperacaoSenha, definirNovaSenha]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

// O hook `useAuth` mora em `./useAuth.ts` — extraído para satisfazer
// `react-refresh/only-export-components`, como o `PostoContext` já faz.
export default AuthContext;
