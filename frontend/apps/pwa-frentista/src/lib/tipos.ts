/**
 * Tipos partilhados entre `App.tsx` e as abas secundárias.
 *
 * @remarks Moram aqui, e não no `App.tsx`, para `screens/aba-secundaria.tsx`
 *          não precisar importar do `App.tsx` — que por sua vez importa a aba.
 */

/** Reexportado de `shared/lib` (onde mora desde 22/09), para os imports antigos seguirem valendo. */
export type { TabType } from '@frentista/shared/lib';

export interface FrentistaSelecionavel {
  id: number;
  nome: string;
  /** Data URL JPEG vinda da coluna `Frentista.foto`. Nulo = mostra as iniciais. */
  foto?: string | null;
}
