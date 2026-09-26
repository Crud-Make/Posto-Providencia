---
name: estrutura-dependencias-frontend
description: Como medir ciclos, fan-in, camadas e fronteira Supabase no frontend/ com um resolvedor próprio; por que god-nodes/affected do graphify não servem para isso e onde eles erram
metadata:
  type: reference
---

**[17/09/2026]** Mapa de dependências do `frontend/` para a decisão de refatoração
incremental (Issues #103 e seguintes).

## Por que não usar o graphify aqui

- `graphify god-nodes` devolve **só símbolo PHP** (`sprintf()`, `Collection`, `Str`…) desde que
  o `backend/` Laravel entrou. Para hub de TS ele é inútil — não é "ruído de tsconfig", é
  outra linguagem dominando o ranking. Confira: `graphify god-nodes --top 20`.
- `graphify affected "conferido()"` acerta o cluster (não mente mais como em 29/07), **mas
  inclui arquivo morto**: ele lista `TabelaFrentistas.tsx`, `DetalhamentoRow.tsx` e
  `DetalhamentoRodapeRows.tsx` como atingidos; esses três não têm nenhum importador. Raio de
  impacto do grafo **superestima** porque não checa alcançabilidade.

## O resolvedor que funciona

Parser próprio em Python sobre `frontend/apps/{web,pwa-frentista,pwa-dono}` e
`frontend/packages/{utils,api-core,types}`, resolvendo os aliases de
`frontend/vite.config.ts` (`@`, `@shared`, `@widgets`, `@pages`, `@posto/*`; nos PWAs `@` aponta
para o **próprio** `src`). Regex precisa cobrir import multilinha (`re.S`), `export … from` e
`await import('…')` dinâmico — sem o dinâmico perde-se `pwa-frentista/src/App.test.tsx`.

Aferição de cobertura antes de confiar no resultado (o parser tem de achar **mais** specs do
que o `rg`, porque `rg` conta linha e há import multilinha):

```bash
rg -U --no-heading -c -e "from\s+['\"](\.|@/|@posto|@shared|@widgets|@pages|@features|@entities|@app)" \
   -g '*.ts' -g '*.tsx' frontend/apps frontend/packages | awk -F: '{s+=$2} END {print s}'
```

## Armadilhas confirmadas

- **Fan-in por caminho sempre subconta.** `services/supabase.ts` é importado como
  `'../supabase'` e `'./supabase'` dentro de `services/api/`; um `rg` por `services/supabase`
  devolve menos da metade dos importadores reais. Mesmo erro de
  [[grep-por-caminho-perde-import-relativo]].
- **Barril re-exporta tudo e infla o raio.** Qualquer módulo de `frontend/packages/utils/src/`
  herda o alcance de `index.ts`, porque todo consumidor importa o barril. Fan-in *direto* de
  `fechamento.ts` é de um dígito; o transitivo passa de 200. Ao medir "o que quebra", separar
  sempre **direto** de **transitivo pelo barril**.
- **`.from(` sem exigir aspas pega `Array.from(`.** É a origem provável do "52 arquivos" da
  Issue #103. O número de chamadas dela (231) está certo; o de arquivos, não. Recontagem certa:
  ```bash
  rg -U --no-heading -o "\.from\(\s*['\"][A-Za-z_]+['\"]" -g '*.ts' -g '*.tsx' \
     frontend/apps/web/src | awk -F: '{print $1}' | sort | uniq -c | awk '{s+=$1;n++} END {print s,"chamadas em",n,"arquivos"}'
  ```

## Fatos estruturais (recontar, não copiar o número)

- **FSD só existe pela metade:** `frontend/tsconfig.json` e `frontend/vite.config.ts` declaram
  `@features`, `@entities` e `@app`, e **essas pastas não existem** em `frontend/apps/web/src`
  (`ls frontend/apps/web/src`). O que existe é `shared`/`widgets`/`pages` convivendo com o
  legado `components`/`services`/`contexts`/`utils`/`types`.
- **Coesão por módulo é alta:** quase todo diretório de `frontend/apps/web/src/components/`
  tem **um único** importador externo (`App.tsx`). Medir com matriz módulo×módulo sobre as
  arestas; as exceções reais são poucas e valem revisita a cada vez.
- **Nenhum app importa de dentro de outro app.** Verificação barata:
  ```bash
  rg -Un "from\s+['\"][^'\"]*(apps/web|apps/pwa-frentista|apps/pwa-dono)[^'\"]*['\"]" \
     -g '*.ts' -g '*.tsx' frontend/apps frontend/packages   # vazio = ok
  ```

## Auditoria 19/09/2026 sobre `origin/fase-a` (40abfee) — o que aprendi de novo

- Medir branch que não é o checkout: `git archive origin/fase-a frontend backend | tar -x -C <scratch>`
  e rodar o resolvedor lá. Retirar comentários (`/* */` e `//`) antes do regex: exemplo em
  JSDoc (`import('./components/…')`) vira aresta falsa.
- **Cliente Supabase por símbolo, não por aresta:** `services/api/base.ts` reexporta
  `supabase` (`export { supabase }` no fim do arquivo) e parte dos services importa de
  `'./base.ts'` (com extensão). Contar importadores de `services/supabase.ts` subconta os que
  seguram o cliente. Conferir:
  `rg -U --no-heading -o "import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*'[^']+'" frontend/apps/web/src | grep -o "from '[^']*'" | sort | uniq -c`
- **`rg -U -o` conta cada casamento em dobro** em alguns arquivos (visto 19/09). Para contar
  chamada `supabase.from/rpc`, usar `re.findall` em Python, não `rg -U -o | wc -l`.
- Ciclo de ARQUIVO: zero. Ciclo de PASTA: `services` ↔ `services/api` só existe por causa de
  `services/index.ts`, que não tem importador (barril morto). Reconfirmar:
  `rg -n "/services['\"]" frontend/apps/web/src` (vazio = morto).
- O ESLint de FSD (`frontend/eslint.config.mjs`, `boundaries/dependencies` com
  `default: "allow"`) não enxerga legado: `shared/` importando `contexts/` ou `utils/`, e
  `components/X` importando `components/Y` por dentro passam verdes. Não há `import/no-cycle`
  nem dependency-cruiser: `grep -n "no-cycle\|dependency-cruiser" frontend/eslint.config.mjs frontend/package.json`.

Backend: ver [[backend-arestas-invisiveis-aos-gates]].

Relacionado: [[superficie-supabase-por-app]], [[api-core-nao-le-compra-nem-tanque]],
[[mover-apps-packages-para-frontend]].
