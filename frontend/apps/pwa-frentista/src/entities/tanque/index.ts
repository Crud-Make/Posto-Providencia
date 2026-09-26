// Public API da entity tanque (FSD-3). De fora, só por aqui.
export { buscarMedicoesDoDia, buscarTanques, salvarMedicao } from './api/tanque-api';
export { buscarMedicoesDoDiaPelaApi, buscarTanquesPelaApi, salvarMedicaoPelaApi } from './api/regua-pela-api';
export {
  TETO_VOLUME_FISICO,
  listaDeTanquesSchema,
  medicaoDoDiaSchema,
  medicaoParaGravarSchema,
  medicaoRelidaSchema,
  medicoesDoDiaSchema,
  tanqueSchema,
} from './model/schema';
export type { MedicaoDoDia, MedicaoParaGravar, Tanque } from './model/schema';
