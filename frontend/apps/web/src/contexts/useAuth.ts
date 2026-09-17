import { useContext } from 'react';
import AuthContext, { type EstadoAutenticacao } from './AuthContext';

/**
 * Acesso ao estado de autenticação do painel.
 *
 * @throws Quando usado fora do `AuthProvider` — erro explícito vale mais que
 *         `null` silencioso, que só apareceria como tela em branco.
 */
export function useAuth(): EstadoAutenticacao {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return contexto;
}
