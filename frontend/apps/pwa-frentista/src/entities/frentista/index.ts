// Public API da entity frentista (FSD-3). De fora, só por aqui.
export { buscarFrentistasAtivos, salvarFotoDoFrentista, marcarPresencaDoFrentista } from './api/frentista-api';
export { frentistaSchema, listaDeFrentistasSchema } from './model/schema';
export type { Frentista } from './model/schema';
