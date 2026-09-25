// Public API da entity fechamento-frentista (FSD-3). De fora, só por aqui.
export {
  avisarDonoDoEnvio,
  buscarEnviosDoDia,
  buscarHistoricoDoFrentista,
  buscarOuCriarFechamento,
  consolidarFechamento,
  enviarFechamentoFrentista,
} from './api/fechamento-frentista-api';
export { enviarTurnoPelaApi } from './api/envio-pela-api';
export { envioRegistradoSchema, paraEnvioDaApi } from './model/envio-pela-api';
export type { EnvioDoTurno, EnvioRegistrado, ValoresDoTurno } from './model/envio-pela-api';
export {
  envioDoDiaSchema,
  enviosDoDiaSchema,
  fechamentoFrentistaPayloadSchema,
  historicoSchema,
  idsDeFechamentoSchema,
  itemDoHistoricoSchema,
  linhaCriadaSchema,
} from './model/schema';
export type { EnvioDoDia, FechamentoFrentistaPayload, ItemDoHistorico, LinhaCriada } from './model/schema';
