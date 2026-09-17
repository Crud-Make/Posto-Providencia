---
name: issue-60-ja-decidiu-sair-do-supabase
description: A Issue #60 (28/08/2026) já decidiu "sair do Supabase para Laravel em VPS" e nunca foi ao CHANGELOG; a #93 (07/09) diz "um Supabase por cliente" — as duas abertas, competindo pelas mesmas semanas
metadata:
  type: project
---

**Conferido em 17/09/2026.**

## A decisão de sair do Supabase já foi tomada uma vez
- **Issue #60** (28/08/2026, aberta, zero comentários): *"migrar a API para Laravel com
  banco próprio em VPS (Fase A)"*. Motivo declarado: 63 policies de RLS como furo de
  isolamento, custo previsível, backup próprio — "não é performance". Fase A = Laravel só
  como persistência/auth/autorização, `frontend/packages/utils` intocado; Fase B (cálculo em PHP)
  é issue separada e **não pode ser feita junto**. Risco escrito nela: "efeito segundo
  sistema — reescrever o backend antes do primeiro cliente rodando e pagando".
- **Não está no CHANGELOG nem em commit** — `grep -n '#60\|VPS\|Laravel' CHANGELOG.md`
  vazio; `git log --all --grep=laravel` vazio. A decisão vive só na issue.
- **Issue #93** (07/09/2026) contradiz em parte: "instalação separada, um projeto Supabase
  por cliente, não multi-tenant" e diz explicitamente "decisão desta issue independe
  daquela". Nenhuma das duas foi fechada; as duas competem pelas mesmas semanas (texto
  da própria #60).

**How to apply:** antes de qualquer conversa sobre "refatorar tudo e pôr Laravel", apontar que a #60 já é o plano, com inventário medido em 28/08, e que ela colide com a #93. Em 17/09 o dono decidiu **focar só neste repo**: o projeto Laravel anterior saiu do repo e da memória a pedido dele — não citar.
