---
name: regra-de-arquitetura-nao-ganha-excecao
description: "18/09 — dono recusou exceção escrita à regra \"módulos só se falam por Application\"; quando o código viola uma regra, a saída é mudar o código, nunca afrouxar a regra"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: eccccbbb-b93f-4ae5-9253-8ce30d0cb443
  modified: 2026-09-18T10:56:59.382Z
---

Regra de arquitetura não ganha exceção. Em 18/09 propus (opção A) uma exceção no Design Doc permitindo `Pessoas\Domain → Cadastro\Domain` para relações Eloquent; o dono aprovou e logo depois corrigiu: "as regras não podem ser violadas". Escolheu mover `Posto` para `App\Compartilhado` (opção C) em PR próprio depois de `refactor/cadastro-sem-ciclo`.

**Why:** para ele, reescrever a regra para caber no código é violá-la por outro nome.

**How to apply:** quando um plano esbarrar numa regra do CLAUDE.md ou do Design Doc, só apresentar opções que cumprem a regra como está. Se nenhuma cumpre, dizer isso e deixar a decisão com o dono, sem recomendar a exceção. Relacionado: [[registro-de-regras-de-arquitetura]], [[backend-modular-e-o-padrao]].
