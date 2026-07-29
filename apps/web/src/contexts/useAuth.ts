import { useContext } from 'react';
import AuthContext, { AuthContextType } from './AuthContext';

/**
 * Hook para acessar o contexto de autenticação
 * @returns AuthContextType - Contexto de autenticação com session, user, loading e funções
 * @throws Error - Se usado fora do AuthProvider
 * @example
 * const { user, signIn, signOut } = useAuth();
 * @remarks Extraído de `AuthContext.tsx` para satisfazer `react-refresh/only-export-components`
 * (Fast Refresh exige que um arquivo .tsx só exporte componentes).
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};
