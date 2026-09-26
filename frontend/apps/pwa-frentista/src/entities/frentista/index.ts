// Public API da entity frentista (FSD-3). De fora, só por aqui.
export { buscarFrentistasAtivos, salvarFotoDoFrentista, marcarPresencaDoFrentista, marcarPresencaPelaApi } from './api/frentista-api';
export { reduzirParaAvatar, iniciais, mensagemDeFoto, TETO_DATA_URL } from './lib/foto';
export type { ErroDeFoto } from './lib/foto';
export { frentistaSchema, listaDeFrentistasSchema } from './model/schema';
export type { Frentista } from './model/schema';
export { buscarFrentistasParaEscolherPelaApi, buscarPerfilPelaApi, salvarFotoPelaApi } from './api/frentista-pela-api';
