---
name: onde-parei-21-09-p8-executando
description: "📍 COMECE AQUI 21/09 — P8 ficou EXECUTANDO ao dormir (árvore suja, sem commit); 3 hooks novos no ar; fila definida até o realtime"
metadata: 
  node_type: memory
  type: project
  originSessionId: 05f6fde6-e78e-4fb4-ada0-87339211356e
  modified: 2026-09-22T01:51:46.862Z
---

Fim do dia 21/09/2026. O dono foi dormir com a **P8 em `modo=executar`** rodando
(`w9zm45j6e`, run `wf_6c301bf6-f1c`) e a **CA-2 em `modo=plano`** (`w1jyrsl74`,
run `wf_815de2d2-705`) ainda sem voltar.

**PRIMEIRA COISA A FAZER:** `git status` e `git diff --stat` na branch
`feat/#102-guard-token-atual`. Se a P8 terminou, a árvore está SUJA e SEM COMMIT — o
workflow nunca commita. Se o PC foi desligado no meio, a árvore pode ter edição
PARCIAL de uma fatia de dinheiro: nesse caso rodar `cd frontend && bun run test:golden`
(esperado 3436/0 na base, mais os do spec novo) antes de qualquer outra coisa, e
comparar com os passos do plano em
`/tmp/.../scratchpad/plano-p8-aprovado.json` (some no reboot; o plano íntegro também
está no journal do run `wf_2c6bb96f-e2c`).

**O que a P8 estava fazendo** (8 passos, 3 decisões do dono em 21/09): (1) aceitar o
`null` — o caminho legado do Supabase passa a gravar `null` em dia não apurado, e isso
MUDA o que a produção grava; (2) `api-core/encerrante.ts` (a TERCEIRA implementação de
`total_vendas`) NÃO entra, vira fatia própria; (3) `calcularTotais` é APAGADO junto com
`calculators.golden.spec.ts`. Cuidado registrado: `FooterAcoes.tsx:71` usa
`totalVendas < 0.005` e tem de virar `=== null`, senão `null < 0.005` é `true` por
coerção. Ver [[total-vendas-vale-o-encerrante]].

**Premissa que caiu:** metade da P8 já tinha subido em `ef42ea0` (20/09) — os dois
goldens existem e o comentário de `useFechamento.ts:137` está CORRETO. Quem está
vencido é `docs/design/fechamento-diario-api.md:307`, que ainda diz o contrário e cita
`POST /consolidar`, rota que não existe. Ver [[golden-que-arredonda-nao-morde]].

**Travas que entraram hoje** (em disco, sem commit; `python3 .claude/hooks/testa-hooks.py`
verde): `controller-nao-fala-com-domain.py` (CA-2, 7 canários),
`dinheiro-quantiza-por-emcentavos.py` (DOM-3, 7 canários) e a **FORMULA do
`so-fable-na-formula.py` estendida** para cobrir `apps/web/src/utils/(calculators|
venda-do-dia)*` e `api-core/encerrante*` — antes disso a fórmula do painel aceitava
qualquer modelo. Ver [[travas-substituem-modelo-caro]].

**Descoberta que muda o diagnóstico:** `docs/arquitetura/regras.md` está DEFASADO (medido
17/09, o PR #119 entrou 18/09). FSD-1/2/3, TS-1..5 e RES-2 já estão ATIVAS —
`eslint-plugin-boundaries@7.2.0` e o plugin do neverthrow estão instalados e o
`trava-ts.py` roda lint type-aware a cada edição. Não re-instalar. O que falta de
verdade é dinheiro: **DOM-6 está VIOLADA** (taxa de cartão por transação em
`usePagamentos.ts:163,173` e `useFechamento.ts:157`) e **DOM-1** — o CI não roda o
golden, a trava só existe no `pre-push` do dono.

**Fila combinada:** P8 → CA-2 → P9 (`useCustoMensal`; pode virar fatia de backend, porque
`Compra` e `Despesa` têm ZERO rotas) → rota de período (resumo mensal dos frentistas) →
**PWA envio** → **realtime no Laravel** ([[realtime-fica-no-laravel]]) → CA-5.

---

**ATUALIZAÇÃO fim da noite — o plano da CA-2 voltou** (`w1jyrsl74`, 9 agentes) e corrigiu a
premissa de novo: a trava CA-2 **já existe desde 18/09** (`9146a8c`,
`backend/tests/Arch/ArquiteturaTest.php:151-153`, forma encadeada) e roda em QUATRO caminhos —
`composer gates`, `scripts/hooks/pre-commit:63`, `.claude/hooks/trava-php.py:47` e
`.github/workflows/ci.yml:84-85`. O "❌ SEM TRAVA" do `regras.md:98` é texto de 17/09, um dia
mais velho que a trava. **Violações de controller hoje: ZERO** (16 arquivos alcançam `Domain`
a partir de `Http`, todos legítimos: 14 Resources + 2 middlewares).

O plano NÃO foi executado — espera o "ok" do dono. Ele fecha 4 buracos medidos:
**B1** `App\Compartilhado\Posto` (é `final class Posto extends Model`, `Posto.php:32`) escapa
das três travas; **B2** pasta nova tipo `Http/Acoes/` passaria — conserto é quebrar a camada
`Http` do `deptrac.yaml` em `HttpBorda` (Resources/Middleware, pode `Domain`) e
`HttpControllers` (deny-por-padrão, sem `Domain`), usando o `BoolCollector` do deptrac 4.7.2;
**B3** a metade "escrita passa por Application" **não tem teste nenhum** — nem Deptrac nem
`arch()` enxergam chamada de método; precisa de varredura textual
(`tests/Unit/Arquitetura/EscritaSoPorApplicationTest.php`); **B4** o hook estava untracked e
não pegava `app/Http/Controllers/` nem `App\Models`. **B5** (`routes/` fora do `paths` do
Deptrac) fica registrado, não fechado: é CA-1, não CA-2.

**O B4 foi consertado ainda em 21/09** pela thread principal: `CONTROLLER` passou a pegar o
caminho legado sem segmento de módulo, e `DOMINIO` passou a pegar `App\Models\` e
`App\Compartilhado\Posto`. 11 canários verdes. **MAS O HOOK SEGUE UNTRACKED** — como o plano
apontou, hook não commitado morre no próximo clone e não vale para o DeepSeek em outra
árvore. **Commitar os 3 hooks é a primeira coisa a fazer amanhã**, e precisa do "ok" do dono.

**Pedido do dono ao dormir (21/09): "depois já podemos testar o multi-tenant".** ⚠️ Ler
[[multi-tenant-impossivel-sem-migration]] ANTES de tentar: o bloqueio não é de código, é de
ESQUEMA — cinco uniques de tabela escopada não incluem `posto_id`, e o
`Fechamento (data, turno_id)` impede literalmente dois postos de fecharem o mesmo dia. Testar
hoje reprova no banco, não na aplicação. Entra na fila como fatia de migration, e vem depois
de [[realtime-fica-no-laravel]] ou antes, se o dono repriorizar — mas nunca "só testando".
