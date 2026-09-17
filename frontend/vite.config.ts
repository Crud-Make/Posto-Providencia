import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
	return {
		root: path.resolve(__dirname, 'apps/web'),
		server: {
			port: 3015,
			host: '0.0.0.0',
		},
		plugins: [react()],
		resolve: {
			alias: {
				// Ordem importa: o resolvedor casa por prefixo seguido de '/',
				// então os aliases específicos vêm antes do '@' genérico.
				'@app': path.resolve(__dirname, './apps/web/src/app'),
				'@pages': path.resolve(__dirname, './apps/web/src/pages'),
				'@widgets': path.resolve(__dirname, './apps/web/src/widgets'),
				'@features': path.resolve(__dirname, './apps/web/src/features'),
				'@entities': path.resolve(__dirname, './apps/web/src/entities'),
				'@shared': path.resolve(__dirname, './apps/web/src/shared'),
				'@': path.resolve(__dirname, './apps/web/src'),
				'@posto/types': path.resolve(__dirname, './packages/types/src/index.ts'),
				'@posto/utils': path.resolve(__dirname, './packages/utils/src/index.ts'),
				'@posto/api-core': path.resolve(__dirname, './packages/api-core/src/index.ts'),
			}
		},
		build: {
			rollupOptions: {
				output: {
					manualChunks: {
						// Separar React e React-DOM em um chunk próprio
						'vendor-react': ['react', 'react-dom'],
						// Separar Recharts (biblioteca de gráficos) em um chunk próprio
						'vendor-charts': ['recharts'],
						// Separar Supabase em um chunk próprio
						'vendor-supabase': ['@supabase/supabase-js'],
						// Separar Lucide icons
						'vendor-icons': ['lucide-react'],
					},
				},
			},
		},
	};
});
