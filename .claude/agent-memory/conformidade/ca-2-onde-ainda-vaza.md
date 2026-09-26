---
name: ca-2-onde-ainda-vaza
description: CA-2 (Controller não fala com Domain) já tem trava em Pest Arch desde 18/09 — o registro mente "SEM TRAVA"; os dois furos REAIS são o model Posto em App\Compartilhado e a pasta routes/ fora do Deptrac
metadata:
  type: project
---

Medido em **21/09/2026** no `backend/` (72 arquivos em `app/`: 6 controllers, 15
Resources, 3 Middleware, 3 FormRequests).

## O registro está atrás do código (de novo)

`docs/arquitetura/regras.md`, linha CA-2, diz "❌ SEM TRAVA — a regra está num
comentário do `deptrac.yaml`". **Isso é falso desde 18/09**: a forma encadeada em
`backend/tests/Arch/ArquiteturaTest.php` já reprova controller → Domain e
controller → `App\Models`, uma regra por namespace de controller descoberto no
disco, e roda no `composer gates` via `@test:cobertura` (`pest --coverage --min=85`).
Conferir antes de "ligar a trava que falta":

```bash
grep -n 'não toca model' backend/tests/Arch/ArquiteturaTest.php
grep -n -A8 '"gates"' backend/composer.json
```

## Os dois furos que sobram — e nenhum deles é "Resource tipa model"

**Why:** a redação do CA-2 fala em "Domain", e as três travas leem a palavra
`Domain` no namespace. O que escapa é o que é model sem morar em `Domain`, e o que
é código de borda sem morar em `app/`.

1. **`App\Compartilhado\Posto` é Eloquent** (`backend/app/Compartilhado/Posto.php:32`,
   `final class Posto extends Model`). A regra do Pest Arch proíbe
   `['App\Models', ...namespacesDosModulos('Domain')]` — `Compartilhado` não está na
   lista; o `deptrac.yaml` libera `Http → Compartilhado` sem ressalva; e o hook
   `.claude/hooks/controller-nao-fala-com-domain.py` casa só
   `App\<Modulo>\Domain\`. Logo `Posto::query()->update(...)` dentro de um controller
   passa VERDE nas três. Hoje só Middleware toca `Posto`
   (`app/Cadastro/Http/Middleware/DefinePostoAtual.php:24`,
   `app/Pessoas/Http/Middleware/ExigeAcessoAoPosto.php:7`) — é uso de borda, legítimo.
2. **`routes/` está fora do Deptrac** (`backend/deptrac.yaml`, `paths: ./app`) e fora
   do Pest Arch (`expect('App')`). Fechamento em closure de rota não é auditado por
   camada; o `phpmd` é o único que olha `routes` (`composer md` → `phpmd app,routes`).
   Hoje há uma closure só, o `/saude`, com `DB::selectOne` cru
   (`backend/routes/api.php:26-43`).

```bash
grep -rn 'extends Model\|extends Authenticatable' backend/app/Compartilhado backend/app/Models
grep -n 'paths:' -A3 backend/deptrac.yaml
grep -n 'CONTROLLER = \|DOMINIO = ' .claude/hooks/controller-nao-fala-com-domain.py
```

## O hook do CA-2 existe e NÃO está commitado

`.claude/hooks/controller-nao-fala-com-domain.py` (PreToolUse, Write|Edit) está ligado
em `.claude/settings.json:118`, mas em 21/09 os dois estavam sujos no `git status`
(`??` e `M`). **How to apply:** trava não commitada vale só nesta máquina e só dentro
do Claude Code — não é gate do repositório, não vale para CI e some no próximo clone.
Antes de dizer "CA-2 travado", rodar `git status --porcelain .claude/hooks .claude/settings.json`.

## O que NÃO é achado no backend (conferido, para não reabrir)

Varredura 21/09 em `backend/app/` + `routes/`: nenhum controller importa `Domain`
ou `App\Models`; nenhuma escrita (`->save()`, `::create(`, `->update(`, `DB::`) dentro
de `app/*/Http/`; nenhum `->validate()`/`Validator::`/`request()` fora de
`Http/Requests/`; nenhum `(float)`/`floatval`/`round()` sobre dinheiro (é string
decimal do Postgres + `bcadd`/`bcsub`/`bccomp`); zero `@phpstan-ignore` /
`SuppressWarnings`; maior função tem 44 linhas
(`app/Estoque/Application/DescontaLitrosVendidos.php:32`), teto 60. O `throw` em
`Application` é invariante de programação (`LogicException`/`RuntimeException`), não
regra de negócio — regra de negócio volta como `RecusaDaGravacao`
(`app/Fechamento/Domain/TotaisDeclarados.php`).

Ver [[travas-do-frontend-quais-existem]], [[divida-aceita]], [[falsos-positivos-varredura]].
