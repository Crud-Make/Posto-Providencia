---
name: ca-2-onde-a-trava-ja-existe
description: CA-2 (Controller não fala com Domain) já tem trava de gate no Pest Arch desde 18/09 — regras.md dizia "SEM TRAVA" por ser mais antigo; os buracos que sobram são Compartilhado\Posto, Http fora de Controllers/ e a metade "escrita passa por Application"
metadata:
  type: project
---

**Fato (medido em 21/09/2026).** A metade "Controller não toca model" da CA-2 **já é gate**
desde `9146a8c` (18/09): `backend/tests/Arch/ArquiteturaTest.php:151-157`, uma regra por
namespace de controller, `->not->toUse(['App\Models', ...namespacesDosModulos('Domain')])`.
A linha `docs/arquitetura/regras.md:98` dizia "❌ SEM TRAVA" porque o registro é de **17/09**
(`1d24d30`), um dia mais velho que a trava.

**Why:** ao ler "SEM TRAVA" no registro a reação natural é escrever a trava do zero e
duplicar uma que já roda no `composer gates`. O registro envelhece; o teste não.

**How to apply:** antes de propor trava para qualquer linha do registro, rodar
`vendor/bin/pest --testsuite=Arch --do-not-cache-result` em `backend/` e ler o
`ArquiteturaTest.php` inteiro — a coluna "Estado" do registro não é fonte.

**A forma que morde (lista dentro do `toUse`, não dentro do `expect`).** Confirmado no
fonte do Pest, não por intuição: `OppositeExpectation::toUse()`
(`backend/vendor/pestphp/pest/src/Expectations/OppositeExpectation.php:70-77`) faz
`array_map` e cria **uma expectativa por alvo**, e
`GroupArchExpectation::ensureLazyExpectationIsVerified()`
(`backend/vendor/pestphp/pest-plugin-arch/src/GroupArchExpectation.php:136-138`) verifica
**todas**. Ou seja: `expect([lista])` é a forma morta (medida em 18/09);
`->not->toUse([lista])` cobre cada item. Reconfirmar:
`sed -n '65,80p' backend/vendor/pestphp/pest/src/Expectations/OppositeExpectation.php`.

**Buracos que sobravam em 21/09** (cada um medido, nenhum é violação real hoje):
1. `App\Compartilhado\Posto` **é model** (`backend/app/Compartilhado/Posto.php:32`
   `extends Model`) e **não está** na lista proibida da regra de controller — nem no
   Deptrac (`Http → Compartilhado` é permitido).
2. A regra só alcança `app/*/Http/Controllers/`; classe nova em `app/X/Http/Acoes/`
   escapa dela e cai na aresta `Http → Domain`, aberta no `deptrac.yaml:50` desde o #111.
3. A metade **"escrita passa por Application"** não tem trava nenhuma: nada impede um
   `Resource`/`Middleware` de chamar `save()/create()/delete()`. Varredura que mostra o
   estado limpo de hoje:
   `grep -rnE -e '->(save|delete|update|fill)\(' -e '::(create|insert|upsert)\(' -e 'DB::' --include='*.php' backend/app | grep -e '/Http/'`
   (hoje só aparecem leituras: `Posto::query()->find` e `Usuario::query()` nos middlewares,
   e `->load('recebimentos')` em `app/Fechamento/Http/Resources/RespostaDaGravacao.php:39`).

Ver [[backend-arestas-invisiveis-aos-gates]] e [[gravacao-fechamento-onde-mora]].
