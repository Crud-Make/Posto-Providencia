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
 * @remarks Liga só com `VITE_API_PWA=1` (ou `true`) E `VITE_API_URL` definida. Desde a fatia 2
 *          (#101), ligada ela desvia TUDO — leituras e escritas — para a API: o PWA não fala com o
 *          Supabase para nada. **Não** segue o `VITE_API_URL` global de propósito: ligá-la é decidir
 *          que o banco da API é o banco de verdade do posto.
 */
export function pwaPelaApiLigado(): boolean {
  const flag = import.meta.env.VITE_API_PWA;
  if (urlDaApi() === null || typeof flag !== 'string') return false;
  const valor = flag.trim().toLowerCase();
  return valor === '1' || valor === 'true';
}
