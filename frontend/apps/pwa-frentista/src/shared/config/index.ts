// Public API de shared/config (FSD-3). Constantes do app que antes eram literais soltos no
// App.tsx (`getFrentistas(1)`, `postoId = 1`, `turnoId = 1`). O posto NÃO mora mais aqui: desde
// 26/09/2026 ele é escolhido no aparelho (`features/escolher-posto`, #101) e chega às telas por props.

/**
 * Turno em que todo envio do frentista cai.
 *
 * @remarks Universal (pedido do dono): o frentista não escolhe turno. Todos os envios do dia
 *          caem num turno canônico único e a web mostra o dia inteiro (`getByDate`).
 */
export const TURNO_CANONICO = 1;

export { pwaPelaApiLigado, urlDaApi } from './api';
