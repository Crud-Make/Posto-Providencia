import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

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
 */
export interface EstadoAutenticacao {
  readonly sessao: Session | null;
  readonly carregando: boolean;
  /** `true` quando há sessão — o banco passa a responder como `authenticated`. */
  readonly autenticado: boolean;
  /**
   * `true` quando o usuário optou por seguir sem entrar.
   *
   * @remarks Existe para a apresentação do sistema não travar caso a senha não
   *          esteja à mão. Nesse modo o painel funciona como sempre funcionou —
   *          como visitante —, com as limitações de permissão descritas acima.
   */
  readonly modoVisitante: boolean;
  entrar: (email: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
  seguirComoVisitante: () => void;
}

const AuthContext = createContext<EstadoAutenticacao | null>(null);

const CHAVE_VISITANTE = 'posto:modo-visitante';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modoVisitante, setModoVisitante] = useState<boolean>(
    () => sessionStorage.getItem(CHAVE_VISITANTE) === '1'
  );

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });

    // Cleanup obrigatório: subscrição viva depois do desmonte vaza canal e
    // estoura o limite de conexão do projeto (CLAUDE.md §5).
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
    });

    return () => {
      ativo = false;
      assinatura.subscription.unsubscribe();
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (!error) {
      sessionStorage.removeItem(CHAVE_VISITANTE);
      setModoVisitante(false);
      return null;
    }

    // A mensagem do Supabase vem em inglês e genérica de propósito (não revela
    // se o e-mail existe). Traduzir mantém a mesma discrição, em pt-BR.
    return /invalid login credentials/i.test(error.message)
      ? 'E-mail ou senha incorretos.'
      : error.message;
  }, []);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem(CHAVE_VISITANTE);
    setModoVisitante(false);
  }, []);

  const seguirComoVisitante = useCallback(() => {
    sessionStorage.setItem(CHAVE_VISITANTE, '1');
    setModoVisitante(true);
  }, []);

  // Sem React Compiler neste projeto: a memoização é manual e necessária, senão
  // todo consumidor do contexto re-renderiza a cada render do provider.
  const valor = useMemo<EstadoAutenticacao>(
    () => ({
      sessao,
      carregando,
      autenticado: sessao !== null,
      modoVisitante,
      entrar,
      sair,
      seguirComoVisitante,
    }),
    [sessao, carregando, modoVisitante, entrar, sair, seguirComoVisitante]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

// O hook `useAuth` mora em `./useAuth.ts` — extraído para satisfazer
// `react-refresh/only-export-components`, como o `PostoContext` já faz.
export default AuthContext;
