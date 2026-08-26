/**
 * Vocabulário do lançamento de taxas de cartão — fora do modal por causa do lint
 * `react-refresh/only-export-components`.
 */
/** Categoria fixa das taxas — a mesma que a carga histórica gravou em `Despesa.categoria`. */
export const CATEGORIA_TAXAS_CARTAO = 'Taxas Cartão';

/** Prefixo da descrição; o provedor vai depois do travessão (`Taxas de cartão — Sicoob`). */
export const PREFIXO_DESCRICAO = 'Taxas de cartão — ';

/**
 * Extrai o provedor de uma descrição gravada por este modal.
 *
 * @returns O nome do provedor, ou `null` se a descrição não veio daqui
 *          (ex.: a linha histórica `"Despeza com das taxas dos Cartao."`).
 */
export function provedorDaDescricao(descricao: string): string | null {
  return descricao.startsWith(PREFIXO_DESCRICAO)
    ? descricao.slice(PREFIXO_DESCRICAO.length).trim() || null
    : null;
}

