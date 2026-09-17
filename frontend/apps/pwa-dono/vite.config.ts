import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Carrega o .env da raiz do monorepo (VITE_SUPABASE_URL/ANON_KEY), como os outros dois
  envDir: path.resolve(__dirname, '../../'),
  server: {
    // 3015 é o painel, 3016 o PWA do frentista.
    port: 3017,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      // `injectManifest` (SW nosso) em vez de `generateSW` (SW gerado): o
      // gerado não tem como receber `push`, e é só por isso que a troca
      // aconteceu. O `src/sw.ts` reproduz de propósito tudo o que o gerado
      // fazia — precache, `skipWaiting`, `clientsClaim` e o `SKIP_WAITING` que
      // o `ReloadPrompt` manda.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        // `id` fixa a identidade do app: sem ele o navegador usa a start_url, e
        // mudar a rota inicial faria o aparelho tratar como um app NOVO,
        // deixando o antigo instalado do lado. Vale `/` porque cada app vai
        // para um domínio próprio — `id` é resolvido por origem.
        id: '/',
        name: 'Posto Providência - Encerrante',
        short_name: 'Encerrante',
        description: 'Leitura das bombas por foto — Posto Providência',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          // Sem um ícone `maskable` o Android encaixa o quadrado dentro de um
          // círculo branco, com moldura — é o detalhe que mais denuncia "isto
          // é um site".
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      // Com `injectManifest` a chave é `injectManifest`, não `workbox` — a
      // `workbox` passa a ser IGNORADA em silêncio. `skipWaiting` e
      // `clientsClaim` deixaram de ser opção e viraram código, em `src/sw.ts`.
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
