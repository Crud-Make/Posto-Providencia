---
name: registro-de-regras-de-arquitetura
description: docs/arquitetura/regras.md é o inventário das 38 regras com a coluna "quem faz cumprir"; o CLAUDE.md 4.0 apagou as regras de frontend que o 3.3 tinha
metadata:
  type: project
---

Criado em 18/09/2026 em `docs/arquitetura/regras.md` (branch `docs/regras-de-arquitetura`).
Inventário de 38 regras em 6 grupos — DOM (dinheiro), FSD, CA (Clean Architecture), RES (Result
Pattern), TS, PROC — cada uma com origem citável, a trava que a faz cumprir e **o arquivo onde
essa trava mora**, ou a marca explícita `SEM TRAVA`.

**O fato-raiz:** o `CLAUDE.md` **4.0 não menciona FSD, kebab-case, `enum`, `any` nem "cálculo de
dinheiro mora em packages/utils"** — medido por grep: 0 ocorrências, contra 3/2/7 no
`.claude/docs/claude-md-3.3-arquivado.md`. As regras do frontend foram **removidas do texto**, não
violadas. O código continua obedecendo por hábito. Quem chegar hoje lendo só o CLAUDE.md não sabe
que a duplicidade `components/` × `widgets/` é strangler intencional.

**Origem das regras de arquitetura:** notebook "Arquitetura de software" no NotebookLM (36 fontes,
único notebook da conta) — FSD, Clean Architecture/DDD, Result Pattern, typescript-eslint com type
information. O dono quer que a IA siga esses padrões.

**Placar em 18/09:** 7 ativas, 8 parciais, 12 sem trava, 12 decididas. As ativas são quase todas
do backend (Deptrac, PHPStan sem baseline, PHPMD, Pest) mais type-aware linting e
`neverthrow/must-use-result`.

**A assimetria que anula metade das travas:** `pre-commit` e `pre-push` rodam **oxlint**; o CI roda
**oxlint + eslint**. As regras de forma (complexidade) estão no oxlint; as de conteúdo (`any`,
`toISOString`, todas as type-aware) estão no eslint. Commit e push local não veem nenhuma regra de
conteúdo. Fechar isso vale mais que acrescentar regra nova.

**Custo medido das regras type-aware que faltam:** `strict-boolean-expressions` = 433 erros,
`no-floating-promises` = 69, `require-await` = 25, `await-thenable` = 0 (esta já entrou).

Ver [[gate-verde-sem-canario-nao-vale]].
