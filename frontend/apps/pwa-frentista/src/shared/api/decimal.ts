import { z } from 'zod';

/**
 * Decimal da API Laravel (#101): o contrato manda dinheiro, litro e quantidade como STRING decimal
 * (`"3688.65"`), nunca número JSON — o PHP perderia casa num float. Aqui ele vira `number` para as
 * TELAS de hoje, que só exibem (`toLocaleString`) e nunca somam com ele: nenhuma fórmula lê este
 * valor. A conta de dinheiro do app continua em `@posto/utils`, sobre o que o frentista digitou.
 */
export const decimalDaApi = z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number);

/** O mesmo, aceitando `null` (balde não informado continua `null`, nunca vira zero). */
export const decimalOuNuloDaApi = decimalDaApi.nullable();
