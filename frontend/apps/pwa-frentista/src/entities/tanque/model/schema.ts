import { z } from 'zod';

/**
 * Tanque do posto com o combustível — a lista da tela de régua (#74).
 * `select('id, combustivel:Combustivel(nome, codigo)')`; o join é many-to-one.
 *
 * @remarks `codigo` é NOT NULL no banco, mas o tipo que a tela já usava aceita `null`; o
 *          schema mantém esse formato para não apertar o contrato numa mudança estrutural.
 */
export const tanqueSchema = z.object({
  id: z.number(),
  combustivel: z.object({ nome: z.string(), codigo: z.string().nullable() }).nullable(),
});

export type Tanque = z.infer<typeof tanqueSchema>;

export const listaDeTanquesSchema = z.array(tanqueSchema).nullable();

/** Medição de régua já gravada no dia (`HistoricoTanque`: as duas colunas são nuláveis). */
export const medicaoDoDiaSchema = z.object({
  tanque_id: z.number().nullable(),
  volume_fisico: z.number().nullable(),
});

export type MedicaoDoDia = z.infer<typeof medicaoDoDiaSchema>;

export const medicoesDoDiaSchema = z.array(medicaoDoDiaSchema).nullable();

/**
 * Releitura da medição logo depois do upsert (conferência anti-RLS silenciosa).
 *
 * @remarks `volume_fisico` aceita número OU texto, sem coerção: a conferência de sempre faz
 *          `Number(gravado.volume_fisico) !== volumeFisico`, e esse `Number()` é o que decide.
 *          Apertar para só número aqui mudaria o resultado da conferência.
 */
export const medicaoRelidaSchema = z
  .object({ volume_fisico: z.union([z.number(), z.string()]).nullable() })
  .nullable();
