import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['**/*.test.{ts,tsx}'],
        // [14/08] Um worktree em `.claude/worktrees/<branch>/` é uma cópia INTEIRA do repo, com
        // os mesmos testes e o seu próprio `node_modules`. Sem esta linha o vitest roda os
        // testes de OUTRA branch junto com os desta: a suíte saltou de 25 arquivos/200 testes
        // para 49/401, com 14 falhas que não eram deste código. É a armadilha do §7 do
        // CLAUDE.md com endereço novo — "baseline de falhas pré-existentes" imaginária.
        // `node_modules` já é excluído por padrão, mas o default some ao declarar `exclude`.
        exclude: ['**/node_modules/**', '**/dist/**', '.claude/worktrees/**'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './apps/web/src'),
            // Paridade com o vite.config.ts: sem este alias, qualquer teste que alcance um
            // arquivo importando '@shared/...' quebra na resolução.
            '@shared': path.resolve(__dirname, './apps/web/src/shared'),
            // Alias do pwa-frentista (`@/` é o web). Paridade com apps/pwa-frentista/vite.config.ts.
            '@frentista': path.resolve(__dirname, './apps/pwa-frentista/src'),
            '@posto/types': path.resolve(__dirname, './packages/types/src/index.ts'),
            '@posto/utils': path.resolve(__dirname, './packages/utils/src/index.ts'),
            '@posto/api-core': path.resolve(__dirname, './packages/api-core/src/index.ts'),
            // Módulo virtual do vite-plugin-pwa: só existe no build do PWA.
            'virtual:pwa-register/react': path.resolve(__dirname, './apps/pwa-frentista/src/test/pwa-register-stub.ts'),
        },
    },
});
