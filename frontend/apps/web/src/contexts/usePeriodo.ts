import { useContext } from 'react';
import PeriodoContext, { PeriodoContextType } from './PeriodoContext';

/**
 * Período de análise compartilhado pelas telas de análise do painel.
 *
 * @throws Error - Se usado fora do `PeriodoProvider`.
 * @remarks Extraído de `PeriodoContext.tsx` para satisfazer `react-refresh/only-export-components`.
 *          **Não** use nas telas de operação (fechamento diário, leituras): o porquê está no
 *          `@remarks` do `PeriodoContext`.
 */
export const usePeriodo = (): PeriodoContextType => {
    const contexto = useContext(PeriodoContext);
    if (contexto === undefined) {
        throw new Error('usePeriodo precisa estar dentro de um PeriodoProvider');
    }
    return contexto;
};
