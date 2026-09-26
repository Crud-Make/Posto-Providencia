---
name: catalogo-api-laravel-vs-painel
description: Contrato do catálogo Laravel (/api/postos/{posto}/*) contra as leituras do painel web — o que trava cada entidade na migração (foto, ativo, decimal string, aggregator protegido)
metadata:
  type: project
---

Levantado em 18/09/2026 sobre `origin/fase-a` (fac0be5), só com `git show`/`git grep` — o grafo
indexa o working tree, que estava em outra branch; para ler outra branch, o grafo não serve.

Fatos que não envelhecem rápido (reconfirmar com o comando ao lado):
- A API **não filtra `ativo`**; quase todo `*.service.ts getAll` do web filtra `.eq('ativo', true)`.
  `git grep -n "orderBy\|where" origin/fase-a -- backend/app/Cadastro/Application/CatalogoDoPosto.php`
- `FrentistaResource` **exclui `foto` de propósito, com teste** ("nunca expõe a foto") — a tela
  `/frentistas` (`useFrentistas.ts`) lê `foto`; paridade exige endpoint próprio, não mapper.
  `git grep -n "foto" origin/fase-a -- backend/tests/Feature/Cadastro/CatalogoTest.php`
- `aggregator.service.ts` (onde vive `fetchSettingsData`, que alimenta `/configuracoes`) é
  arquivo de fórmula para `portao-golden.py` e `so-fable-na-formula.py`: migrar produto/bico/forma
  da tela de configurações por ali exige Fable + golden.
  `grep -n aggregator .claude/hooks/portao-golden.py .claude/hooks/so-fable-na-formula.py`
- `turnoService.getAll`, `bombaService.getAll/getWithBicos` e `bicoService.getAll`: zero chamador.
  `git grep -nE "(turnoService|bombaService)\.|bicoService\.getAll" origin/fase-a -- frontend/apps/web/src`
- `banco/dados/cadastros.sql` é gitignored (só existe no checkout local); o Postgres do Docker só
  tem dado se alguém carregar esse arquivo.

Recomendação dada: primeira fatia = `fornecedorService.getAll` (tela `/compras`, só `id`/`nome`
num `<select>`, paridade só com filtro `ativo` no mapper). Ver [[superficie-supabase-por-app]].
