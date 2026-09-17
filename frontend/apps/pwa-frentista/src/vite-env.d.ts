/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Flag global setada pela EncerranteScreen pra travar o auto-reload do SW (ver ReloadPrompt.tsx).
interface Window {
    __encerranteBusy?: boolean;
}
