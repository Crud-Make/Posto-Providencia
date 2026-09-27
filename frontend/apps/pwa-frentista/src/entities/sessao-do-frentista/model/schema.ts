import { z } from 'zod';

/**
 * A sessão do frentista no PWA (#101): o que `POST /postos/{posto}/frentistas/entrar` devolve e o
 * que fica guardado no aparelho até o fim do turno. `vence_em` é ISO em UTC (`…Z`).
 */
export const sessaoDoFrentistaSchema = z.object({
  token: z.string().min(1),
  vence_em: z.string().min(1),
  frentista: z.object({ id: z.number(), nome: z.string() }),
  /**
   * O posto em que a sessão foi aberta — carimbado pelo PWA ao guardar (a API não o devolve). O
   * posto é escolhido na hora a cada abertura (27/09/2026): a sessão só vale no posto escolhido
   * agora. Sessão guardada antes do carimbo não tem o campo e é descartada ao entrar num posto.
   */
  posto_id: z.number().int().positive().optional(),
});

export type SessaoDoFrentista = z.infer<typeof sessaoDoFrentistaSchema>;
