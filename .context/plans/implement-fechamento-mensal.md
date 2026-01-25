---
status: pending
progress: 100
generated: 2026-01-25
agents:
  - type: "architect-specialist"
    role: "Design the data aggregation strategy and API endpoints"
  - type: "backend-specialist"
    role: "Implement the database queries and API for monthly closing"
  - type: "frontend-specialist"
    role: "Create the Monthly Closing dashboard and visualization"
lastUpdated: "2026-01-25T21:02:03.254Z"
---

# Feature Fechamento Mensal - Plan

## 1. Goal
Implement a "Fechamento Mensal" (Monthly Closing) feature that automatically consolidates daily sales, nozzle readings (encerrantes), and profit calculations. It must reflect real-time data as attendants (frentistas) submit their closings.

## 2. Architecture & Design
- **Source of Truth**: Existing `fechamentos` and `frentista_sessions` tables.
- **Data Strategy**: Real-time aggregation via Database Views or Optimized Queries (Supabase). No duplicate storage to ensure "automatic update" on every new daily submission.
- **Key Metrics**:
  - Total Volume (Litros) per Fuel.
  - Gross Revenue (Faturamento Bruto).
  - Net Profit (Lucro Líquido) calculated as: `(Volume * Margem) - (Cartão * Taxa) - Despesas`.
  - Operational Costs (Taxas Cartão based on `regras-negocio.md`).

## 3. Implementation Phases

### Phase 1: Data Modeling & API (Backend)
- **Objective**: Create efficient queries to aggregate daily data into monthly views.
- **Tasks**:
  1. Create a Supabase/Postgres function or view `get_fechamento_mensal(mes, ano)` that sums up:
     - `leituras` (Encerrante Final - Inicial) for Volume.
     - `transacoes_financeiras` for Revenue/Payments.
  2. Implement profit calculation logic directly in the query or API service using the constants from `regras-negocio.md` (Taxas: Debito 1.2%, Credito 3.5%; Margens: Gasolina ~11.79%, Diesel ~2.73%).
  3. Create an endpoint `/api/fechamento-mensal` allowing filter by Month/Year.

### Phase 2: Frontend Dashboard (UI)
- **Objective**: Visualize the monthly progress.
- **Tasks**:
  1. Create a new route/page `/fechamento-mensal`.
  2. **Header**: Month selector, Total Profit, Total Volume KPI cards.
  3. **Charts**: 
     - "Lucro vs Meta" (Progress bar).
     - "Evolução Diária" (Bar/Line chart of sales per day).
  4. **Table**: "Demonstrativo Diário" listing each day's summary (Data, Litros, Venda Bruta, Lucro Líq, Status).

### Phase 3: Integration & Automation
- **Objective**: Ensure the screen updates automatically.
- **Tasks**:
  1. Connect UI to the new API.
  2. Verify that adding a new "Fechamento Diário" instantly reflects in the Monthly totals (Real-time/Revalidation).
  3. Add "Export to Excel" button to match the client's current workflow.

## 4. Success Criteria
- [ ] Dashboard shows correct totals summing up all daily closings of the selected month.
- [ ] Profit calculations match the rules (Margins and Card Fees applied).
- [ ] "Automatic Update": Submitting a daily closing immediately updates the monthly numbers without manual intervention.
- [ ] UI follows the "Premium" dark theme aesthetic.

## 5. Rollback Plan
- Remove the new route and API endpoint.
- No structural database changes (schema migrations) are strictly required if using Views, so rollback is low risk.

## Execution History

> Last updated: 2026-01-25T21:02:03.254Z | Progress: 100%

### E [DONE]
- Started: 2026-01-25T20:59:30.084Z
- Completed: 2026-01-25T21:02:03.254Z

- [x] Step 1: Step 1 *(2026-01-25T20:59:30.084Z)*
- [x] Step 2: Step 2 *(2026-01-25T21:00:31.597Z)*
- [x] Step 3: Step 3 *(2026-01-25T21:02:03.254Z)*
