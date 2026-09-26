// Canário de RES-1/RES-3 em shared/ui (.tsx) do pwa-frentista (ver src/__canarios__/travas.test.ts).
// Viola DE PROPÓSITO: componente lançando e capturando em vez de devolver Result.
// O teste afirma LINHAS: não reordene.
export function Aviso({ texto }: { texto: string }): React.JSX.Element {
  if (texto === '') throw new Error('sem texto'); // RES-1: throw fora da borda
  return <p>{texto}</p>;
}

export function AvisoSeguro({ texto }: { texto: string }): React.JSX.Element {
  try { // RES-3: try/catch fora da borda
    return Aviso({ texto });
  } catch {
    return <p />;
  }
}
