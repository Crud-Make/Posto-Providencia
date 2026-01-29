# Plan: Fix Fechamento Table Clearing on Save

## 1. Goals and Scope
- Prevent the Daily Closing (Fechamento Diário) tables from clearing/flickering when the user clicks "Save".
- Ensure that the final state of the UI before the page reload reflects the successful save, rather than reverting to a "loading" or "empty" state.

## 2. Implementation Phases

### Phase 1: Analysis & Bug Reproduction
- **Task**: Confirm that `limparAutoSave()` triggers the `useEffect` in `TelaFechamentoDiario`.
- **Observation**: When `rascunhoRestaurado` goes from `Object` to `null`, the `else` block in the component's `useEffect` executes, calling `carregarLeituras()` and `carregarSessoes()`.

### Phase 2: Implementation of UI Fix
- **Task**: Modify `apps/web/src/components/fechamento-diario/index.tsx`.
- **Change**: In the `useEffect` that handles restoration/loading, add a condition to skip calling `carregar*` functions if `saving` is true or if `success` has been achieved.
- **Logic**: 
  ```typescript
  if (restaurado && !saving && !success) {
     // ... only then load from DB or restore
  }
  ```

### Phase 3: Robustness Improvements
- **Task**: Update `useLeituras` and `useSessoesFrentistas` to be more resilient.
- **Change**: Add context checks to `useSessoesFrentistas` similar to `useLeituras`'s `ultimoContextoCarregado` to avoid redundant API calls if the date/turno hasn't changed.

### Phase 4: Verification
- **Task**: Run manual tests.
- **Criterid**: Clicking save should show the success message, and the table data should remain visible until the page reloads after 2 seconds.

## 3. Agent Assignments
- **frontend-specialist**: Implement the UI logic change in `index.tsx`.
- **bug-fixer**: Analyze if there are race conditions in `useSubmissaoFechamento`.

## 4. Success Criteria
- Daily closing data remains on screen after clicking save.
- No "Empty Table" flash between save completion and page reload.
- AutoSave is still correctly cleared so that on reload, the fresh DB data is fetched.
