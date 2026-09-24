// Public API da entity tanque (FSD-3). De fora, só por aqui.
export { buscarMedicoesDoDia, buscarTanques, salvarMedicao } from './api/tanque-api';
export { listaDeTanquesSchema, medicaoDoDiaSchema, medicaoRelidaSchema, medicoesDoDiaSchema, tanqueSchema } from './model/schema';
export type { MedicaoDoDia, Tanque } from './model/schema';
