// Canário do `shared → legado` (ver src/__canarios__/travas.test.ts). Viola DE PROPÓSITO.
// Fica em `ignores` do eslint; só o teste o linta, com --no-ignore. O teste afirma LINHAS: não reordene.
import type { TabType } from '@frentista/lib/tipos'; // shared importando a pasta legada src/lib
import { formatCurrency } from '../formatar-moeda'; // dentro do próprio shared: permitido

export const aba: TabType = 'registro';
export const usados = [formatCurrency];
