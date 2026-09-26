import { z } from 'zod';

/**
 * Linha de `Frentista` como o app lê: `select('id, nome, foto')`.
 *
 * @remarks Mesmo formato de `banco/init/01-esquema-base.sql` (`nome text NOT NULL`, `foto text`
 *          nulável), sem coerção. `foto` é a data URL JPEG do avatar; nulo = mostra as iniciais.
 */
export const frentistaSchema = z.object({
  id: z.number(),
  nome: z.string(),
  foto: z.string().nullable(),
});

export type Frentista = z.infer<typeof frentistaSchema>;

/** Resposta de `getFrentistas`: a lista, ou `null` (o client nunca devolve, mas o tipo permite). */
export const listaDeFrentistasSchema = z.array(frentistaSchema).nullable();
