/**
 * Chave do strangler do PWA do frentista (#101): o mesmo desenho de `urlDaApi`/`loginPelaApiLigado`
 * do painel (`apps/web/src/services/api/base.ts`), reescrito aqui porque app não importa de app.
 */

/** Base da API Laravel, sem barra no fim, ou `null` quando o PWA ainda fala só com o Supabase. */
export function urlDaApi(): string | null {
  const url = import.meta.env.VITE_API_URL;
  return typeof url === 'string' && url.trim() !== '' ? url.trim().replace(/\/+$/, '') : null;
}

/**
 * `true` quando o frentista entra por PIN e o envio do turno e a presença vão para a API.
 *
 * @remarks Liga só com `VITE_API_PWA=1` (ou `true`) E `VITE_API_URL` definida. **Não** segue o
 *          global: o PWA ainda lê do Supabase (lista de frentistas, envios do dia, histórico,
 *          vendas, tanques), e ligar a escrita pela API contra um banco que não é o mesmo que o
 *          Supabase lê deixaria a trava "já enviou" da tela olhando o lugar errado.
 */
export function pwaPelaApiLigado(): boolean {
  const flag = import.meta.env.VITE_API_PWA;
  if (urlDaApi() === null || typeof flag !== 'string') return false;
  const valor = flag.trim().toLowerCase();
  return valor === '1' || valor === 'true';
}
