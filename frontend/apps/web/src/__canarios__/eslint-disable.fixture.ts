// Canário do `--no-inline-config` da catraca (ver travas.test.ts). Viola DE PROPÓSITO e
// esconde a violação com comentário — a catraca tem de enxergar as duas mesmo assim.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const escondidoNaLinha: any = 1;
/* eslint-disable @typescript-eslint/no-explicit-any */
export const escondidoNoBloco: any = 2;
