# Painel web pela API — Design Doc

Issue: #103 (mãe: #60) · Estado: **rascunho — sem pendência com o dono** · Data: 17/09/2026

> A maior fatia da Fase A. Cada módulo abre sub-issue própria quando chega a vez; este doc é o
> contrato comum às oito.
> Base: levantamento do agente `grafo` em 17/09 (`.claude/agent-memory/grafo/estrutura-dependencias-frontend.md`).

## 0. ⚠️ Correção do número da issue

A issue diz **231 chamadas em 52 arquivos**. São **231 chamadas em 45 arquivos**.

O 52 veio de contar `.from(` sem exigir a aspa — o padrão captura também `Array.from(`. Comando
conferido:

```bash
rg -U -o "\.from\(\s*['\"][A-Za-z_]+['\"]" -g '*.ts' -g '*.tsx' frontend/apps/web/src
# → 231 chamadas em 45 arquivos
```

O texto da issue precisa ser corrigido: planejar 52 arquivos e migrar 45 esconde a conclusão errada
de que sobraram 7.

## 1. O grafo diz que dá para fazer módulo a módulo

Medido em 17/09: **zero ciclo de import**, **zero acoplamento entre apps**, **zero violação de camada
FSD**. E o número que decide: **23 módulos, 21 deles com exatamente um importador externo** — o
`App.tsx`. São ilhas.

Existem **três** acoplamentos entre módulos no painel inteiro, e só **um é de runtime**:

| Acoplamento | Tipo |
|---|---|
| `leituras-diarias/hooks/useLeiturasDiarias.ts:5` → `fechamento-diario/hooks/useLeituras.ts` | **runtime** ⚠️ |
| `financeiro/index.tsx:14-15` → `despesas/…` | import type |
| `fechamento-diario/index.tsx:47` → `fechamento-mensal` | import |

**O primeiro cai exatamente entre os itens 1 e 2 da ordem da issue.** Ou os dois módulos migram
juntos, ou `useLeituras` é extraído antes. Migrar o item 1 sozinho quebra o item 2.

Fora isso, a ordem proposta na issue é compatível com o grafo e fica como está.

## 2. DECISÃO 1 — o adaptador entra em `base.ts`, não em 45 arquivos

`frontend/apps/web/src/services/api/base.ts:5` importa o client do Supabase e exporta
`withPostoFilter`. **11 services entram por ele.** É o ponto de estrangulamento: plantar ali o
adaptador para a API Laravel migra um bloco de uma vez, em vez de 45 edições independentes.

Os outros 30 services importam o client direto (`from '../supabase'`, `from './supabase'`). **Aviso
de método para quem executar:** contar essa fronteira por caminho subconta pela metade — um `rg` por
`services/supabase` devolve 18 dos 41. **Contar pelo símbolo, nunca pelo caminho.**

## 3. DECISÃO 2 — a troca do login acontece aqui, não na #102

Herdado do Design Doc da #102: uma sessão Laravel **não é** JWT do Supabase, e **24 das 103 policies**
do esquema decidem por `auth.role()`. Se o `AuthContext` trocar antes de o painel parar de falar com
o Postgres, o usuário fica autenticado no Laravel e **`anon` no banco** — que é exatamente a janela
do "reset do painel apaga em silêncio".

Então: `frontend/apps/web/src/contexts/AuthContext.tsx` e `contexts/useAuth.ts` trocam **nesta
issue**, junto com a última chamada direta ao Postgres. Nunca antes.

Nota de grep herdada do levantamento: procurar só por `AuthContext` **perde 3 dos 4 consumidores** —
eles importam `useAuth`. Buscar pelos dois símbolos.

## 4. Regras da fatia

- **Cálculo não muda de lugar.** Continua em `frontend/packages/utils`. A API devolve dados. Se um
  endpoint precisar calcular, é decisão de Design Doc com golden — como já foi feito na #100, onde a
  resposta foi "devolve dado".
- **`reset.service.ts` e `limpezaMes.service.ts` não ganham endpoint nesta fase.** São destrutivos, a
  issue já os exclui, e há precedente ruim documentado (reset rodando como `anon`, RLS engolindo o
  erro e o app reportando sucesso com zeros). Recomendo manter fora da Fase A inteira, não só desta
  issue. `reset.service.ts:64` é, aliás, a função mais complexa do monorepo (CCN 34).
- **Realtime é a #104** e depende desta: enquanto o painel falar com o Postgres, o canal do Supabase
  continua sendo a fonte do sinal.

## 5. Cuidado com o barril

`frontend/packages/utils/src/index.ts` tem **104 importadores diretos e 205 transitivos, em 4 apps**.
`lucro.ts` tem 11 diretos e **225 transitivos** — porque todo mundo entra pelo barril.

Consequência prática: **mudar assinatura de qualquer módulo de `utils` atravessa os três apps.** Se
uma sub-issue precisar de uma forma nova, ela **acrescenta** função em vez de mudar a existente, e a
antiga sai depois, sozinha.

Os três `types/` somam 134 importadores diretos — acoplamento de tipo, não de runtime, e o mais
barato de resolver.

## 6. Oportunidade: a dívida de complexidade sai junto

Sete dos 13 arquivos listados como dívida em `frontend/.oxlintrc.json` são tocados por esta issue:
`useSubmissaoFechamento.ts` (27), `aggregator.service.ts` (24), `TabelaLeituras.tsx` (25),
`SecaoVendas.tsx` (27), `ValidationAlert.tsx` (29), `planilha-do-mes` (30 e 32), `login/index.tsx` (24).

Reescrever o transporte desses arquivos é o momento natural de tirá-los da lista. **Cada sub-issue
que migrar um deles remove a entrada do `overrides`** — é assim que a catraca aperta sem virar uma
tarefa de refatoração separada que ninguém faz.

## Pronto quando

`rg "\.from\(\s*['\"]" frontend/apps/web/src` vazio; `bun run test` e `bun run test:golden` verdes;
validação módulo a módulo em `localhost:3015` pela skill `validar-feature-posto-providencia`.

## Riscos

- ⚠️ **66 selects têm join embutido** (`usuario:Usuario(id, nome)`). O PostgREST resolve join na
  query; a API Laravel resolve com eager loading. Endpoint que esquecer o `with()` vira N+1 — o §5 do
  CLAUDE.md cobra isso, e a #97 já estabeleceu o padrão.
- ⚠️ `Usuario` **não aparece** num `rg "\.from\('Usuario'"`: entra por select embutido em
  `services/api/fechamento.service.ts` e é renderizado em `relatorio-diario`. Procurar tabela só pelo
  `.from()` produz o falso "ninguém lê essa tabela".
- Auth tem **cobertura de teste zero** hoje. A troca do `AuthContext` desta issue nasce sem rede
  herdada.
