import { z } from 'zod';

/**
 * Um posto da rede como o PWA do frentista o conhece: só `id` e `nome` — é tudo o que
 * `GET /api/postos` devolve (rota pública, antes do PIN; #101, decisão do dono de 26/09/2026).
 */
export const postoSchema = z.object({
  id: z.number().int().positive(),
  nome: z.string(),
});

export type Posto = z.infer<typeof postoSchema>;

/** Resposta de `GET /api/postos`: os postos ATIVOS, por id. */
export const postosDaApiSchema = z.object({ data: z.array(postoSchema) });

/**
 * O posto em que o aparelho está, e a troca. Chega às telas por props, a partir da porta da
 * feature `escolher-posto` — nunca de uma constante.
 */
export interface PostoAtual {
  readonly posto: Posto;
  /** `false` com um posto só na rede: não há para onde trocar, e o botão nem aparece. */
  readonly podeTrocar: boolean;
  /** Encerra a sessão de PIN do aparelho e volta à tela "Escolha o posto". */
  readonly trocarPosto: () => void;
}
