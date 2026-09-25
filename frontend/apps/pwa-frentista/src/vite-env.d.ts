/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
    /** Base da API Laravel (`backend/`), ex.: `http://localhost:8000`. Sem ela o PWA segue no Supabase. */
    readonly VITE_API_URL?: string;
    /**
     * `1` (ou `true`) faz o PWA do frentista entrar por PIN e enviar o turno e a presença pela API
     * (#101, fatia 1). Exige `VITE_API_URL`. Ausente, o caminho do Supabase segue intacto.
     */
    readonly VITE_API_PWA?: string;
}

// Flag global setada pela EncerranteScreen pra travar o auto-reload do SW (ver ReloadPrompt.tsx).
interface Window {
    __encerranteBusy?: boolean;
}
