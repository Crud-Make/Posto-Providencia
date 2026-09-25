---
name: ca-2-ja-tem-trava-desde-9146a8c
description: CA-2 (controller não toca Domain) já é travada por Pest Arch desde 18/09/2026 (9146a8c); o "❌ SEM TRAVA" de regras.md:98 é texto obsoleto escrito um dia antes (1d24d30, 17/09)
metadata:
  type: project
---

`docs/arquitetura/regras.md:98` diz que a CA-2 está **❌ SEM TRAVA** e que "a regra está num
comentário do `deptrac.yaml`". **Isso é falso desde 18/09/2026.**

- A linha CA-2 foi escrita em `1d24d30` (17/09/2026, branch `docs/regras-de-arquitetura`).
- A trava entrou no dia seguinte em `9146a8c` (18/09/2026, `chore/travas-laravel`), em
  `backend/tests/Arch/ArquiteturaTest.php:151-157`, já na forma **encadeada** exigida:
  `arch(...)->expect($controllers)->not->toUse(['App\Models', ...namespacesDosModulos('Domain')])`,
  um namespace por regra, com canário registrado no comentário `:148-150`.
- Ninguém voltou para atualizar a coluna Estado. O texto e o código divergiram e nunca reconciliaram.

**Why:** a coluna "Estado" de `regras.md` é lida como fonte de verdade para decidir o que refatorar.
Confiar nela sem abrir `ArquiteturaTest.php` gera trabalho duplicado — foi o que quase aconteceu na
fatia "ligar a trava da CA-2" de 21/09/2026.

**How to apply:** antes de aceitar qualquer "❌ SEM TRAVA" de `docs/arquitetura/regras.md`, rodar
`git blame -L <linha>,<linha> docs/arquitetura/regras.md` e comparar a data com
`git log --oneline -- backend/tests/Arch/ArquiteturaTest.php`. A tabela é mais velha que o código.

## O que de fato falta na CA-2 (lacuna real, medida em 21/09/2026)

1. `App\Compartilhado\Posto` é model e **não** está na lista proibida: `namespacesDosModulos('Domain')`
   só varre `app/*/Domain`, e `Compartilhado` não tem pasta `Domain`
   (`app/Compartilhado/Posto.php`). O `deptrac.yaml:51` libera `Http → Compartilhado`.
   Um controller poderia importar o model `Posto` com os dois gates verdes.
   Hoje: 0 controllers fazem isso — só 2 middlewares (borda legítima),
   `app/Cadastro/Http/Middleware/DefinePostoAtual.php:7` e
   `app/Pessoas/Http/Middleware/ExigeAcessoAoPosto.php:7`.
2. A quebra de `Http` em `HttpControllers`/`HttpBorda` no Deptrac, proposta em
   `regras.md:105-107` e listada como passo 3 em `regras.md:216`, **nunca foi implementada**:
   `git log --all -S'HttpBorda'` só acha `1d24d30`, que é o próprio texto da proposta.
   Seria defesa em profundidade (Deptrac roda no CI), não a trava inexistente.

Ver [[quem-abriu-http-para-domain-pr-111]].
