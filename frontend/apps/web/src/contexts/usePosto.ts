import { useContext } from 'react';
import PostoContext, { PostoContextType } from './PostoContext';

/**
 * Hook para acessar o contexto de posto ativo.
 * @throws Error - Se usado fora do PostoProvider
 * @remarks Extraído de `PostoContext.tsx` para satisfazer `react-refresh/only-export-components`
 * (Fast Refresh exige que um arquivo .tsx só exporte componentes).
 */
export const usePosto = (): PostoContextType => {
    const context = useContext(PostoContext);
    if (!context) {
        throw new Error('usePosto deve ser usado dentro de um PostoProvider');
    }
    return context;
};
