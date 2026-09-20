---
name: tetos-de-qualidade-19-09
description: "19/09 — dono fixou os tetos: complexidade 10 no frontend (já, com catraca), 300 linhas por arquivo e 60 por função (front e back); taxa de cartão = despesa do mês (lucro.ts)"
metadata: 
  node_type: memory
  type: project
  originSessionId: eccccbbb-b93f-4ae5-9253-8ce30d0cb443
  modified: 2026-09-19T09:58:44.197Z
---

Decisões do dono em 19/09/2026, a partir da auditoria de saúde (fase-a @ 40abfee):
- **Complexidade ciclomática no frontend: 10, já**, com catraca por arquivo (66 funções acima hoje em 52
  arquivos ficam congeladas e só descem); some a lista de 13 isenções de 35 do .oxlintrc.json.
- **Teto de 300 linhas por arquivo**, frontend e backend (26 arquivos acima hoje, congelados; backend máx 178).
- **Teto de 60 linhas por função/componente** (161 acima hoje, 37 delas > 200), congeladas.
- **Taxa de cartão é despesa do mês** (convenção do lucro.ts/planilha). O desconto por transação do fechamento
  diário (totalTaxas/totalLiquido em float, usePagamentos.ts:163/:173 e useFechamento.ts:157) vira só
  conferência; consolidar depois pelo Fable com golden.

**Why:** CLAUDE.md pede CCN ≤ 10; o teto real era 20 + escape de 35; "arquivo pequeno" era 900.

**How to apply:** tudo pelo pacote de travas de qualidade (workflow refatora-modulo), cada regra no hook do
Claude + pre-commit + CI, com canário e catraca (nada novo passa; o legado só desce). Ver
[[gate-verde-sem-canario-nao-vale]], [[sempre-pelo-workflow-refatora-modulo]], [[taxa-cartao-e-despesa-do-mes]].

**Lista de regras novas APROVADA pelo dono em 19/09:** Q-1..Q-4, D-1..D-6, M-1, M-2, E-1, E-2, R-1 (código) e
P-1..P-6 (processo). Texto completo em scratchpad da sessão `regras-novas-aprovadas.md`; entram no
docs/arquitetura/regras.md junto com o 1º PR das travas de qualidade, com "quem faz cumprir" e canário.
P-2/P-3/P-4 = PR dos 6 hooks; P-1 e P-5 sem hook possível (workflow + revisão).

**Convenções decididas 19/09:** arquivo conta linha física (300); função conta só linha útil, sem branco e
sem comentário (60) — é o que reproduz 26 arquivos / 161 funções. Testes e golden FORA dos tetos de
tamanho (complexidade 10 vale para eles). eslint-plugin-import-x autorizado (PR-7, ciclo de import).
Plano das travas: 8 PRs — PR-1 pre-push roda ESLint; PR-2 catraca de MEDIDA (hoje conta só quantidade:
função congelada em CCN 27 podia ir a 40 verde); PR-3 tetos do front no ESLint e saída do oxlint;
PR-4 tetos do back (PHPMD); PR-5 fronteiras do back (CA-2, App\Models, factory); PR-6 DefinePostoAtual →
App\Compartilhado\Middleware + RotasTest; PR-7 import-x/no-cycle + legado no boundaries; PR-8 enum e throw.
Plano em scratchpad plano-travas.json.
