// Canário do FSD (ver apps/web/src/__canarios__/travas.test.ts). Viola DE PROPÓSITO.
// Fica em `ignores` do eslint; só o teste o linta, com --no-ignore.
import TelaPlanilhaMensal from '@pages/planilha-mensal'; // widget → page: camada de cima
import { CentroDoMes } from '@widgets/resumo-mensal/ui/centro-do-mes'; // slice vizinho + arquivo interno
import { hojeIso } from '../../utils/periodo'; // legado fora das camadas: permitido

export const usados = [TelaPlanilhaMensal, CentroDoMes, hojeIso];

export async function salva(): Promise<void> {}
export function soltaPromise(): void {
  salva(); // no-floating-promises
}
export function zeroEhFalso(valor: number): string {
  return valor ? 'tem' : 'não tem'; // strict-boolean-expressions
}
