/// <reference types="vite/client" />

interface ImportMetaEnv {
    /**
     * Base da API Laravel (`backend/`), ex.: `http://localhost:8000`. Sem ela o painel segue lendo
     * do Supabase — é o que mantém a produção intacta durante o strangler da #103.
     */
    readonly VITE_API_URL?: string;

    /**
     * Corte do strangler por tela, para acender uma de cada vez. `1`/`true` liga, `0`/`false`
     * desliga; ausente ou vazia, vale o `VITE_API_URL`.
     *
     * @remarks
     * Existe para o ensaio de 27/09/2026: `VITE_API_URL` liga, mas o Dashboard e o Registro de
     * Compras ficam com `0` e continuam no Supabase. Sem isso, ligar o global troca o motor das
     * três telas mistas no mesmo minuto — e o fechamento do dia é dinheiro do posto.
     */
    readonly VITE_API_DASHBOARD?: string;
    readonly VITE_API_FORNECEDOR?: string;
}
