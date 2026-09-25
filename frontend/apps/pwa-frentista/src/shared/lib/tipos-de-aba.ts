/**
 * Abas do PWA do frentista.
 *
 * @remarks Mora em `shared` desde a revisão do lote 1 (22/09/2026): `shared/lib/aba-salva.ts`
 *          importava de `@frentista/lib/tipos`, a pasta legada fora das camadas — import na
 *          direção errada. `lib/tipos.ts` reexporta daqui para os consumidores antigos.
 */
export type TabType = 'registro' | 'vendas' | 'historico' | 'tanques' | 'perfil';
