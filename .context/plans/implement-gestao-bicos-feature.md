---
status: pending
progress: 100
generated: 2026-01-25
agents:
  - type: "code-reviewer"
    role: "Review code quality and consistency"
  - type: "feature-developer"
    role: "Implement the UI and logic for the new tab"
  - type: "architect-specialist"
    role: "Oversee the integration with existing architecture"
  - type: "frontend-specialist"
    role: "Build the React components"
lastUpdated: "2026-01-25T20:44:08.435Z"
---

# Feature Gestão de Bicos - Plan

## 1. Goal
Implement a new tab "Gestão de Bicos" in the Daily Closing (Fechamento Diário) screen. This feature allows detailed management of nozzle readings, providing a dedicated interface for monitoring and editing nozzle states during the closing process.

## 2. Architecture & Design
- **Location**: `apps/web/src/components/fechamento-diario/`
- **New Component**: `components/TabGestaoBicos.tsx`
- **Modifications**:
  - `components/HeaderFechamento.tsx`: Add the new navigation tab.
  - `index.tsx`: Orchestrate the visibility of the new tab and pass necessary props.
- **Data Flow**: Will utilize existing hooks (`useCarregamentoDados`, `useLeituras`) to fetch and update nozzle data.

## 3. Implementation Phases

### Phase 1: Structure & Navigation
**Goal**: Enable navigation to the new tab.
1.  **Modify Header**: Update `HeaderFechamento.tsx` to include the "Gestão de Bicos" tab button.
2.  **Update Orchestrator**: Update `TelaFechamentoDiario` state to handle the 'gestao-bicos' active tab state.
3.  **Scaffold Component**: Create a basic `TabGestaoBicos.tsx` placeholder.

### Phase 2: Component Implementation
**Goal**: Build the functional interface.
1.  **Develop UI**: logic for listing nozzles (bicos) with current readings and status.
2.  **Integrate Data**: Connect to `bicos` and `leituras` data from props.
3.  **Interactivity**: Allow updating prices or readings if required (referencing `updateBicoPrice` if applicable).

### Phase 3: Validation & Refinement
**Goal**: Ensure quality and stability.
1.  **Test Navigation**: Verify switching between tabs maintains state.
2.  **Test Data Sync**: Ensure changes in logic reflect in other tabs (e.g., if a reading alters sales).
3.  **Styling**: Apply consistent design tokens (Tailwind CSS, dark mode).

## 4. Success Criteria
- [ ] User can click "Gestão de Bicos" in the header and see the new view.
- [ ] List of nozzles is displayed correctly.
- [ ] Design matches the "Premium" aesthetic of the existing app.
- [ ] No regression in existing tabs (Leituras, Financeiro).

## 5. Rollback Plan
- Revert changes to `HeaderFechamento.tsx` and `index.tsx`.
- Delete `TabGestaoBicos.tsx`.

## Execution History

> Last updated: 2026-01-25T20:44:08.435Z | Progress: 100%

### E [DONE]
- Started: 2026-01-25T20:43:59.412Z
- Completed: 2026-01-25T20:44:08.435Z

- [x] Step 1: Step 1 *(2026-01-25T20:43:59.412Z)*
- [x] Step 2: Step 2 *(2026-01-25T20:44:08.435Z)*
