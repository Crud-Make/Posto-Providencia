// Public API de shared/config (FSD-3). Constantes do app que antes eram literais soltos no
// App.tsx (`POSTO_ID = 1`, `getFrentistas(1)`, `postoId = 1`, `turnoId = 1`).

/** Posto único deste app. Multi-tenant ainda não existe: o PWA do frentista serve o posto 1. */
export const POSTO_ID = 1;

/**
 * Turno em que todo envio do frentista cai.
 *
 * @remarks Universal (pedido do dono): o frentista não escolhe turno. Todos os envios do dia
 *          caem num turno canônico único e a web mostra o dia inteiro (`getByDate`).
 */
export const TURNO_CANONICO = 1;

export { pwaPelaApiLigado, urlDaApi } from './api';
