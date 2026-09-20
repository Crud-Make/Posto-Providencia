/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Base da API Laravel (`backend/`), ex.: `http://localhost:8000`. Sem ela o painel segue lendo
     * do Supabase — é o que mantém a produção intacta durante o strangler da #103.
     */
    readonly VITE_API_URL?: string;
}
