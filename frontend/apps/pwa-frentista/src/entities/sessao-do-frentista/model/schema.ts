import { z } from 'zod';

/**
 * A sessão do frentista no PWA (#101): o que `POST /postos/{posto}/frentistas/entrar` devolve e o
 * que fica guardado no aparelho até o fim do turno. `vence_em` é ISO em UTC (`…Z`).
 */
export const sessaoDoFrentistaSchema = z.object({
  token: z.string().min(1),
  vence_em: z.string().min(1),
  frentista: z.object({ id: z.number(), nome: z.string() }),
});

export type SessaoDoFrentista = z.infer<typeof sessaoDoFrentistaSchema>;
