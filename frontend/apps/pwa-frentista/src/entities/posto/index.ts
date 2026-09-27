// Public API da entity posto (FSD-3): a escolha do posto no PWA do frentista (#101). Desde 27/09/2026
// o posto é escolhido NA HORA, toda vez que o app abre — nada de posto guardado no aparelho.
export { buscarPostosAtivos, buscarPostosAtivosPelaApi, postosSemRede } from './api/posto-api';
export { postoParaEntrar } from './lib/posto-para-entrar';
export { postoSchema, postosDaApiSchema } from './model/schema';
export type { Posto, PostoAtual } from './model/schema';
