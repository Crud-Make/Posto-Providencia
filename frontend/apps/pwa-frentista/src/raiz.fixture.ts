// Canário da FSD-3 feito da RAIZ do src, onde App.tsx e main.tsx moram: `./pages/x/y` fura a
// Public API do slice tanto quanto `@frentista/pages/x/y`. Viola DE PROPÓSITO; está em `ignores`
// do eslint (**/*.fixture.ts) e só o teste o linta. Ver src/__canarios__/travas.test.ts.
import { alvoDaPagina } from './pages/__canarios__/alvo'; // FSD-3: arquivo interno do slice

export const usados = [alvoDaPagina];
