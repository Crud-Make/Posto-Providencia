import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Carrega o .env da raiz do monorepo (VITE_SUPABASE_URL/ANON_KEY), como a web
  envDir: path.resolve(__dirname, '../../'),
  server: {
    port: 3016, // Porta 3016 para o PWA (já que a web usa 3015)
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
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        // `id` fixa a identidade do app: sem ele o navegador usa a start_url, e
        // mudar a rota inicial faria o aparelho tratar como um app NOVO,
        // deixando o antigo instalado do lado.
        id: '/',
        name: 'Posto Providência - Fechamento',
        short_name: 'Fechamento',
        description: 'Fechamento de caixa do frentista — Posto Providência',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        theme_color: '#0f172a', // slate-900 (Dark Mode Base)
        background_color: '#0f172a',
        display: 'standalone',
        // O frentista usa de pé, com o celular na mão; girar a tela no meio do
        // lançamento só atrapalha.
        orientation: 'portrait',
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
          // é um site". O conteúdo deste cabe na zona segura de 80%.
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ]
});
