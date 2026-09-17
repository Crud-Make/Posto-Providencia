import { useContext } from 'react';
import ThemeContext, { ThemeContextType } from './ThemeContext';

/**
 * Hook para acessar o contexto de tema (claro/escuro).
 * @throws Error - Se usado fora do ThemeProvider
 * @remarks Extraído de `ThemeContext.tsx` para satisfazer `react-refresh/only-export-components`
 * (Fast Refresh exige que um arquivo .tsx só exporte componentes).
 */
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
