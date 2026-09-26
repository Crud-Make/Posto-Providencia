---
name: gravacao-fechamento-onde-mora
description: Onde mora a ESCRITA do fechamento do dia (painel + PWAs + backend Laravel) e os comandos que reconfirmam cada ponto
metadata:
  type: project
---

Conferido em **20/09/2026** por grep/psql, não pelo grafo.

A gravação do dia tem **três escritores concorrentes** das mesmas tabelas
(`Fechamento`, `FechamentoFrentista`, `Leitura`, `Recebimento`), todos ainda
via Supabase/PostgREST:

1. painel — `apps/web/src/components/fechamento-diario/hooks/useSubmissaoFechamento.ts`
   (único call site de produção: `.../fechamento-diario/index.tsx`);
2. PWA do frentista — `apps/pwa-frentista/src/services/api.ts`;
3. PWA do dono / OCR — `packages/api-core/src/encerrante.ts`.

O (1) usa `TURNO_TAMPAO_ATE_A_MIGRACAO` e o (3) usa `TURNO_CANONICO`; os dois
valem **1**, e é isso que faz o unique `(data, turno_id)` segurar um fechamento
por dia.

**Why:** qualquer fatia que mova a escrita para a API Laravel tem de decidir o
que acontece com os outros dois — eles continuam gravando pelo caminho velho e
o `consolidarFechamento` do (3) **reescreve** `total_vendas`/`diferenca` do pai
depois.

**How to apply:** antes de dizer "quem escreve é X", rode

```bash
cd frontend && rg -Un --no-heading "from\('(Leitura|Fechamento|FechamentoFrentista|Recebimento)'\)" apps packages --glob '!*.test.*'
cd frontend && rg -Un --no-heading "TURNO_CANONICO\s*=|TURNO_TAMPAO" apps packages
```

Backend: o módulo `backend/app/Fechamento` é **só leitura** e não é importado
por nenhum outro módulo de `app/` — só por `routes/api.php`, factories e testes.
Reconfirma com:

```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
rg -Un --no-heading 'App\\Fechamento\\[A-Za-z\\]*' backend --glob '*.php' -o | sort | uniq -c
```

Ver [[grafo-mentiu-affected-parcial]] e [[janela-de-escrita-e-estoque-onde-medir]].
