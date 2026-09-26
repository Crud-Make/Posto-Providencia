/**
 * Borda com o `localStorage` (#101). Mora em `shared/api` porque o armazenamento do aparelho é
 * mundo externo como a rede: em aba anônima ou com o armazenamento cheio ele LANÇA, e o
 * `try/catch` só é permitido aqui (RES-3). Falhar aqui nunca derruba a tela: ler vira `null`,
 * gravar e apagar viram nada.
 */

export function lerDoAparelho(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

/** O valor guardado já lido como JSON; ausente ou malformado vira `undefined` (o schema recusa depois). */
export function lerJsonDoAparelho(chave: string): unknown {
  const texto = lerDoAparelho(chave);
  if (texto === null) return undefined;
  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return undefined;
  }
}

export function gravarNoAparelho(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Sem armazenamento, a sessão dura só enquanto a tela estiver aberta: o PIN é pedido de novo.
  }
}

export function apagarDoAparelho(chave: string): void {
  try {
    localStorage.removeItem(chave);
  } catch {
    // Idem: nada a fazer se o armazenamento não responde.
  }
}
