/**
 * Máscara de moeda do campo digitado: só os dígitos contam, e os dois últimos são centavos.
 *
 * @param value O texto cru do `<input>` ("12345", "1.234,5x"…).
 * @returns "123,45" em pt-BR, ou `''` quando não sobra dígito nenhum.
 *
 * @remarks Cópia literal do `formatCurrency` que morava no `App.tsx` (P7b da refatoração FSD
 *          do pwa, 22/09/2026). É exibição: o único lugar em que o float é permitido. O valor
 *          que vai para o banco NÃO sai daqui — sai da montagem do payload no `App.tsx`.
 */
export const formatCurrency = (value: string): string => {
  const numericValue = value.replace(/\D/g, '');
  if (!numericValue) return '';
  const amount = parseInt(numericValue, 10) / 100;
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
