// Canário do FSD do pwa-frentista (ver src/__canarios__/travas.test.ts). Viola DE PROPÓSITO.
// Fica em `ignores` do eslint; só o teste o linta, com --no-ignore. O teste afirma LINHAS: não reordene.
import { alvoDaPagina } from '@frentista/pages/__canarios__'; // FSD-1: widget → page (camada de cima), pela Public API
import { interno as PeloVizinho } from '@frentista/widgets/__canario-vizinho__'; // FSD-2: slice vizinho, mesmo pela Public API
import { interno as PorDentro } from '@frentista/widgets/__canario-vizinho__/interno'; // FSD-3: arquivo interno do vizinho
import { hojeIso } from '@/utils/periodo'; // FSD-5: `@/` é o apps/web
import { USUARIO_SISTEMA_ID } from '@shared/constants/usuario-sistema'; // FSD-5: alias @shared/ é do web
import { hojeIso as PeloCaminhoDoWeb } from '../../../../../apps/web/src/utils/periodo'; // FSD-5 (outro app) + FSD-6 (../ ×2+)
import type { TabType } from '../../lib/tipos'; // FSD-6: subiu dois níveis — era @frentista/lib/tipos
import { interno as MesmoSlice } from './vizinho'; // mesmo slice: permitido

export const usados = [alvoDaPagina, PeloVizinho, PorDentro, hojeIso, USUARIO_SISTEMA_ID, PeloCaminhoDoWeb, MesmoSlice];
export enum Aba { Registro = 'registro' } // TS-8: enum
export const aba: TabType = 'registro';
