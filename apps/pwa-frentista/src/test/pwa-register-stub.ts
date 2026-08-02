/**
 * Stub de `virtual:pwa-register/react` para os testes.
 *
 * @remarks O módulo é gerado pelo vite-plugin-pwa em tempo de build e não existe
 *          fora dele — sem este alias (ver `vitest.config.ts`), qualquer teste que
 *          alcance `ReloadPrompt` quebra na resolução do import, antes mesmo de
 *          `vi.mock` ter chance de agir.
 */
export const useRegisterSW = () => ({
    needRefresh: [false, () => { }] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => { }] as [boolean, (v: boolean) => void],
    updateServiceWorker: async () => { },
});
