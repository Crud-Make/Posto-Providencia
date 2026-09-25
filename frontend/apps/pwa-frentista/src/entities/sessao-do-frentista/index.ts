// Public API da entity sessao-do-frentista (FSD-3): o login do frentista por PIN (#101).
export { entrarComPin } from './api/sessao-api';
export { CHAVE_SESSAO, esquecerSessao, guardarSessao, sessaoDoAparelho, sessaoGuardada } from './lib/sessao-guardada';
export { sessaoDoFrentistaSchema } from './model/schema';
export type { SessaoDoFrentista } from './model/schema';
