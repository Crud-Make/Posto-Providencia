// Canário de RES-1/RES-3 no pwa-frentista (ver src/__canarios__/travas.test.ts). Viola DE
// PROPÓSITO: regra de negócio em features/ lançando e capturando em vez de devolver Result.
// O teste afirma LINHAS: não reordene.
export function lancaEmVezDeResult(encerrante: number): number {
  if (encerrante < 0) throw new Error('encerrante negativo'); // RES-1: throw em regra de negócio
  return encerrante;
}

export function capturaEmVezDeResult(encerrante: number): number {
  try { // RES-3: try/catch fora da borda
    return lancaEmVezDeResult(encerrante);
  } catch {
    return 0;
  }
}
