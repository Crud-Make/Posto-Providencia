import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	return {
		root: path.resolve(__dirname, 'apps/web'),
		server: {
			port: 3015,
			host: '0.0.0.0',
		},
		plugins: [react()],
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './apps/web/src'),
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
