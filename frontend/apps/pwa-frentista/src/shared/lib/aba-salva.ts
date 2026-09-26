import type { TabType } from './tipos-de-aba';

/**
 * Abas que este app ainda tem.
 *
 * @remarks Existe por causa da saída do Encerrante para o app do dono. A aba
 *          ficava salva em `localStorage` (`pwa.activeTab`), e o celular de
 *          quem já usava o app guarda `'encerrante'` — um valor que não
 *          corresponde mais a tela nenhuma. Sem esta conferência, o app abriria
 *          no Registro com a barra inferior sem nada selecionado, e o frentista
 *          veria o app "esquecido" numa aba fantasma.
 */
export const ABAS_VALIDAS: readonly TabType[] = ['registro', 'vendas', 'historico', 'tanques', 'perfil'];

/**
 * A aba salva, se ainda existe; senão, o Registro.
 *
 * @param valor O que está em `localStorage['pwa.activeTab']` (ou `null`).
 * @returns Uma aba válida.
 */
export const abaSalvaOuPadrao = (valor: string | null): TabType =>
  ABAS_VALIDAS.includes(valor as TabType) ? (valor as TabType) : 'registro';
