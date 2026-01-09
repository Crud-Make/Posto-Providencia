Vou executar a **Fase 4 (Integração)** da refatoração do arquivo `TelaFechamentoDiario.tsx`, conforme detalhado em `documentos\refatoração.md`.

O objetivo é reduzir o arquivo de ~2.600 linhas para ~400 linhas, eliminando código duplicado e utilizando os hooks e componentes já criados.

### Plano de Execução

1.  **Integrar Utilitários (`utils/formatters.ts`)**
    *   Substituir funções locais `parseValue`, `formatToBR`, `formatSimpleValue` pelas versões importadas de `utils/formatters.ts`.
    *   Remover código duplicado.

2.  **Integrar Hook de Dados (`hooks/useCarregamentoDados.ts`)**
    *   Substituir estados locais (`bicos`, `frentistas`, `turnos`, `loading`, `error`) pelo hook `useCarregamentoDados`.
    *   Remover efeitos (`useEffect`) e funções de carregamento manuais.

3.  **Integrar Hook de Leituras (`hooks/useLeituras.ts`)**
    *   Substituir estado `leituras` e lógica de manipulação (`handleInicialChange`, `handleFechamentoChange`) pelo hook `useLeituras`.
    *   Substituir cálculos manuais de volume por funções do hook.

4.  **Integrar Hook de Sessões (`hooks/useSessoesFrentistas.ts`)**
    *   Substituir estado `frentistaSessions` e lógica de gerenciamento pelo hook `useSessoesFrentistas`.

5.  **Integrar Hook de Pagamentos (`hooks/usePagamentos.ts`)**
    *   Centralizar lógica de pagamentos utilizando o hook dedicado.

6.  **Integrar Hook de AutoSave (`hooks/useAutoSave.ts`)**
    *   Remover lógica complexa de `useEffect` para salvar/restaurar rascunho e usar `useAutoSave`.

7.  **Integrar Hook de Fechamento (`hooks/useFechamento.ts`)**
    *   Centralizar cálculos finais e lógica de envio do fechamento.

8.  **Substituir JSX por Componentes**
    *   Substituir tabelas e seções longas pelos componentes já criados:
        *   `<SecaoLeituras />`
        *   `<SecaoSessoesFrentistas />`
        *   `<SecaoPagamentos />`
        *   `<SecaoResumo />`

### Verificação
Após cada etapa, farei uma verificação para garantir que a funcionalidade foi mantida.
