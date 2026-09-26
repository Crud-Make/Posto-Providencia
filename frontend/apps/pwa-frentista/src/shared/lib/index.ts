// Public API de shared/lib (FSD-3): funções puras, sem I/O, sem `throw`/`try` (RES-1/RES-3).
export { formatCurrency } from './formatar-moeda';
export { dataFechamentoInicial } from './data-fechamento';
export { ABAS_VALIDAS, abaSalvaOuPadrao } from './aba-salva';
export type { TabType } from './tipos-de-aba';
