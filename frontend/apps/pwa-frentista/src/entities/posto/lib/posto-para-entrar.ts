import type { Posto } from '../model/schema';

/**
 * Em qual posto o aparelho entra sem perguntar: só quando há UM posto ativo na rede. Com dois ou
 * mais, `null` — o PWA pergunta o posto toda vez que abre (decisão do dono, 27/09/2026:
 * o posto NÃO fica guardado no aparelho).
 */
export function postoParaEntrar(postos: readonly Posto[]): Posto | null {
  return postos.length === 1 ? (postos[0] ?? null) : null;
}
