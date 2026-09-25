---
name: backend-arestas-invisiveis-aos-gates
description: Onde o Deptrac e o Pest Arch do backend Laravel NÃO enxergam dependência entre módulos (rota, Provider, factory, tabela por string, App\Models) e como rodar o deptrac em outra branch
metadata:
  type: reference
---

**[19/09/2026, medido em `origin/fase-a` 40abfee]** Zero `use App\<Outro>` entre Cadastro,
Pessoas, Agregacao e Fechamento — mas os gates só olham `namespace` dentro de `app/`. Arestas
reais que passam por fora:

- **Rota:** `backend/routes/api.php` põe a rota `dashboard` da Agregacao dentro do grupo com
  `Cadastro\Http\Middleware\DefinePostoAtual`. Agregacao depende de Cadastro em runtime.
  `git grep -n "DefinePostoAtual\|AgregacaoController" origin/fase-a -- backend/routes`
- **Tabela por string:** `Agregacao/Application/DadosDoPeriodo.php` lê `Leitura`, `Compra`,
  `Combustivel`, `Despesa` via `DB::table`/`join` — acoplamento de schema, proposital (CA-7).
  `git grep -n "DB::table\|join('" origin/fase-a -- backend/app/Agregacao`
- **Provider:** `AppServiceProvider` liga `PostoPolicy` (Pessoas) ao `Posto` (Compartilhado);
  `deptrac.yaml` exclui `Providers/` e o Pest não trata Providers como módulo.
- **Factories:** `deptrac.yaml` tem `paths: ./app` só — as regras da camada Factories nunca
  são avaliadas do lado da factory. Domain→Factories é liberado e o Pest proíbe só `App\<Outro>`,
  então `use Database\Factories\UsuarioFactory` dentro de `Cadastro\Domain` passaria (inferência
  pela config; sem canário rodado).
- **`App\Models`** está na camada Domain do deptrac e fora da lista de módulos do Pest: é porta
  dos fundos compartilhada por todos.

Rodar deptrac em branch extraída funciona (AST, não autoload):
`ln -s <repo>/backend/vendor <scratch>/backend/vendor && php vendor/bin/deptrac analyse --config-file=deptrac.yaml --cache-file=<scratch>/d.cache`.
**Pest NÃO funciona assim**: o autoload do vendor aponta para o `app/` do checkout principal e
todo `arch()` dá erro `TestCase::group()`. Para Pest, usar worktree de verdade.

Relacionado: [[estrutura-dependencias-frontend]], [[catalogo-api-laravel-vs-painel]].
