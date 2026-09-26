---
name: quem-abriu-http-para-domain-pr-111
description: A aresta Http → Domain do deptrac.yaml foi aberta em 2517d2c (17/09/2026), PR #111 = issue #97; o PR body explica por quê e prova que o Deptrac morde de verdade
metadata:
  type: project
---

`backend/deptrac.yaml:50` (`- Domain  # só para tipar e serializar (Resources, middleware que
resolve rota); escrita passa por Application`) entrou em **`2517d2c`, 17/09/2026**,
commit *"feat(backend): módulo Cadastro — models, escopo por posto, policy e catálogo só
leitura (#97)"*, mergeado em 18/09/2026 pelo **PR #111** (`feat/#97-models-cadastro` → `fase-a`).

A citação "PR #111" que aparece em `docs/arquitetura/regras.md:98` está **correta**: o PR é o 111,
a issue é a 97 — é o mesmo commit. Não é erro de referência.

Razão, no corpo do PR #111 (não parafrasear — é o texto do dono):

> "Deptrac: `Http → Domain` liberado só para tipar/serializar; camada `Factories`. A primeira
> versão do trait conhecia `Posto` (Compartilhado → Domain) e o Deptrac barrou: a relação
> `posto()` foi para cada model."

**Why:** os Resources precisam do tipo do model para serializar. Fechar a aresta no Deptrac
quebraria 15 Resources legítimos — é por isso que a trava da CA-2 vive no Pest Arch
(ver [[ca-2-ja-tem-trava-desde-9146a8c]]) e não no Deptrac.

**How to apply:** quem propuser "fechar `Http → Domain`" tem de listar antes os 15 Resources que
importam Domain (`app/{Cadastro,Fechamento}/Http/Resources/*.php`) e os 3 usos de Compartilhado
nos middlewares. Sem essa lista, a proposta quebra o build.

O trecho acima também é a prova de que o Deptrac **não** é um gate morto: ele já reprovou uma
violação real (`Compartilhado → Domain`) e mudou o desenho do trait `PertenceAoPosto`.
