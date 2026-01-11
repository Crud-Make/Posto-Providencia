# INSTRUÇÕES AGENTE - SPRINT 4

> **Foco:** Refatoração TelaDashboardProprietario.tsx
> **Data:** 11/01/2026

## 1. Contexto
Você está refatorando o `TelaDashboardProprietario.tsx` (599 linhas). O objetivo é modularizar usando a estrutura definida no PRD-022.

## 2. Passo a Passo

### Fase 1: Preparação
1. Criar branch `refactor/dashboard-proprietario`.
2. Criar pasta `src/components/dashboard-proprietario/`.
3. Criar subpastas `components` e `hooks`.
4. Criar arquivo de tipos `types.ts`.

### Fase 2: Hooks
1. Criar `useDashboardProprietario.ts`.
   - Mover lógica de `loadData` do componente original.
   - Usar `Promise.all` para buscar dados.
   - Implementar lógica de agregação.
   - **Atenção:** O componente original faz queries diretas ao Supabase (`supabase.from(...)`). Tente usar os services existentes (`postoService`, `frentistaService`) onde possível. Se não houver service para Dívida/Empréstimo, crie funções auxiliares dentro do hook ou um `dashboardService.ts` local.

### Fase 3: Componentes UI
1. `FiltrosDashboard.tsx`: Simples select/tabs para período.
2. `ResumoExecutivo.tsx`: Os 4 cards coloridos do topo.
3. `DemonstrativoFinanceiro.tsx`: A seção de 3 colunas (Receita/Despesa/Resultado).
4. `AlertasGerenciais.tsx`: A lista de alertas no final.
5. **Dica:** Copie o JSX do original e limpe as referências a dados, substituindo por props tipadas.

### Fase 4: Integração
1. Criar `TelaDashboardProprietario.tsx` (novo) na pasta raiz do módulo.
2. Conectar hook e componentes.
3. Substituir importação no `App.tsx` (ou manter o nome do arquivo e exportar default).

### Fase 5: Validação
1. Verificar se os valores batem com o dashboard antigo (se possível comparar mentalmente a lógica).
2. Testar responsividade.
3. Rodar build.

## 3. Regras
- JSDoc em Português.
- Sem `any`.
- Manter visual (gradientes, ícones Lucide).
