# Saneamento pré-release — fila ordenada

> **Aberto em 28/08/2026.** Ordenado a partir de três varreduras (`grafo`, `conformidade`,
> `historico`), não de estimativa. Cada item tem `arquivo:linha` conferido.
>
> **Linha de base medida em 28/08 (`feat/redesenho-login`, 1 commit à frente da `main`):**
> `test:golden` **3233 pass / 0 fail** · `test` **362 pass / 41 arquivos / 0 fail** ·
> `type-check` limpo · `lint` limpo · `build` ✅ 13,7s.
> **Toda onda termina com esses cinco no mesmo estado ou melhor.**
>
> **O §0.6 NÃO está bloqueando.** `docs/data/` está no disco e o golden está verde — o ETL
> estágio 2 repôs a pasta. Mexer em fórmula está liberado, desde que com golden junto.

---

## Antes do primeiro commit

```bash
git tag versao-testada-funcionando-custo-lucro 834e2d7   # não existe ponto de retorno hoje
git checkout -b refactor/saneamento-pre-release main
```

**Não existe nenhuma ref `versao-testada-funcionando-*` neste repo** — o §9 pede e nunca foi
criada. As 3 tags existentes (`v2.5.8`, `v2.6.0-teste-fechamento`, `v3.0.0`) são todas de janeiro,
anteriores ao `packages/utils` canônico, e nenhuma serve.

**Colisão de branch: nenhuma.** As duas branches vivas (`feat/redesenho-login`,
`docs/memoria-skill-venda-elias`) não tocam nenhum arquivo desta fila; o remoto só tem `main`.

### Regras da empreitada

1. **Uma onda por PR, e nunca misture categorias.** Item de fórmula e item estrutural no mesmo PR
   é reprovado por definição (§7 + skill `refatoracao-posto-providencia`).
2. **Commit pequeno com o golden junto** é o único modo que funcionou nesta base. Os quatro
   big-bang que tentaram o contrário — PRs **#6, #25, #29, #33, #34**, do bot Jules, até
   +435/−2700 em 35 arquivos — ficaram **7 meses parados e foram fechados sem merge**. Os que
   entraram e ficaram foram `db8aa5d`, `2a97224`, `0296430`: pequenos, com teste no mesmo commit.
3. **Não toque em carga de dado.** Banco zerado de propósito; o dono mandou esperar a auditoria de
   outra sessão. Esta fila é de **código**.
4. **Nunca rode `git clean -fdx` nesta árvore.** `docs/data/`, `graphify-out/` e `.env.local` são
   gitignored: sumiriam sem aviso, o `git status` continuaria limpo e os 5 golden masters
   estourariam. Já aconteceu em 29/07.
5. **Antes de declarar que um número "não existe", cheque o banco, não só a planilha.** Em 12/08
   um commit removeu 11 asserções do golden com justificativa longa e convincente — a despesa era
   real, morava na tabela `Despesa` do Supabase. Revertido 3 minutos depois. *"O erro nunca foi o
   número — foi o nome."*
6. **Nada de merge na `main` sem o "ok" explícito do dono** (§9).
7. Item marcado **🔴 MUDA NÚMERO** para e chama o dono, mesmo com teste verde.
8. **Zona de cuidado:** `useAutoSave` + `useFechamento` já foram revertidos uma vez (`0f201ef`,
   08/01/2026) e o motivo é **ilegível** — o commit original não resolve mais, perdido no rewrite
   de 29/07. Os hooks irmãos entraram e ficaram; só essa dupla voltou atrás. Pise devagar ali.

---

## ONDA 0 — parar de mentir

**Primeiro de tudo, acima de qualquer limpeza.** Estes são os únicos itens da fila que produzem
número **errado por construção**, não apenas divergente. Se o dono olhar uma dessas telas hoje e
decidir alguma coisa, o prejuízo é direto.

### 0.1 — 🔴 Margem de 18% inventada, rotulada "Lucro Total"
`apps/web/src/components/fechamento-diario/components/detalhamento/TabelaConciliacaoFrentistas.tsx:113`
```ts
paraReais(totaisGerais.vendas * 0.18)
```
Viola o §6 com nome e sobrenome (*"custo por litro **nunca** valor fixo hardcoded"*).
**Saída:** ou chama `lucroCombustivel` de `packages/utils/src/lucro.ts:75` (com golden), ou o
rótulo sai da tela. Não existe terceira opção — número inventado com nome de lucro é o pior
resultado possível.

### 0.2 — 🔴 Volume histórico gerado por `Math.random()`
`apps/web/src/components/vendas/dashboard/hooks/useDashboardVendas.ts:126`
```ts
Math.floor(totalLitros * (0.8 + Math.random() * 0.4))
```
Preenche os 5 meses anteriores do gráfico de evolução. **Redesenhado a cada render** — o gráfico
muda sozinho na frente de quem olha.
**Saída:** série real de `packages/utils/src/serie-diaria.ts`, ou o gráfico mostra só o mês que
tem dado. Gráfico vazio é honesto; gráfico aleatório não.

### 0.3 — 🔴 Lucro por frentista que é ficção
`apps/web/src/services/api/aggregator.service.ts:439-443` — calcula `margemMedia` global e aplica
`profit = c.totalSales × margemMedia` **por frentista**. O total fecha; cada linha é invenção
(quem vendeu diesel e quem vendeu gasolina recebem a mesma margem). Vai para a UI como "Lucro Est.".
**Saída:** margem por produto, ou a coluna sai.

### 0.4 — 🔴 O fallback `0,45/L`, ativo **hoje**
`apps/web/src/services/api/aggregator.service.ts:56` e `:926`
```ts
configuracaoService.getValorNumerico('despesa_operacional_litro', 0.45)
```
O arquivo chama `despesaOperacionalPorLitro` corretamente — e quando ela devolve 0 (mês sem
despesa lançada) **substitui pelo fixo**. §6 proíbe literalmente.
**Agravante:** com o banco em replay desde 14/08, *mês sem despesa lançada é o estado normal*.
Este fallback está rodando silenciosamente em todo dashboard neste momento.
**Saída:** devolver `null` e a UI dizer "sem despesa lançada", nunca um número inventado.

### 0.5 — Projeção que projeta um zero
`apps/web/src/components/fechamento-mensal/index.tsx:85`
```ts
const projectedProfit = (totalizers.lucro / daysPassed) * daysInMonth;
```
Projeção financeira no corpo do componente (§3: componente que calcula dinheiro está errado por
definição), sobre `totalizers` (`:59-66`) que soma `lucro_liquido` e `custo_taxas` — **colunas
carimbadas que o app nunca grava** (ver 3.3). Hoje projeta zero.

---

## ONDA 1 — limpeza sem risco. PRs de 20 minutos, podem sair em paralelo.

Nenhum item aqui toca dinheiro. Critério de pronto: `type-check` + `lint` + `build` + as duas
suítes, tudo no mesmo estado da linha de base.

### 1.1 — Código morto do `aggregator.service.ts` (~330 de 963 linhas)
Três métodos sem nenhum consumidor de produção, só o barril:
`fetchClosingData:501` · `fetchAttendantsData:609` · `fetchInventoryData:724`
Ajustar junto: `apps/web/src/services/api/index.ts:51-53` e `aggregator.attendants.test.ts`.
**Bônus:** `index.ts:45` ainda exporta `aggregatorService as legacyService` — o arquivo nasceu
como `legacy.service.ts` em 09/01/2026 (o que não coube na modularização do `api.ts`) e foi
rebatizado um dia depois com documentação de "Facade pattern". O alias pode ir junto.

### 1.2 — 4 `enum` mortos
`packages/types/src/database/enums.ts:9,18,29,37` — `StatusFechamento`, `FormaPagamento`,
`TipoEscala`, `UserRole`. Reexportados por `database/index.ts:7`, **nenhum membro acessado em
lugar nenhum**. §4 proíbe `enum`; estes nem são usados. `git rm` + tirar a linha 7 do barril.
⚠️ `FormaPagamento` é homônimo de tabela do Supabase e de um tipo em `configuracoes/types.ts` —
grep pelo nome dá dezenas de falsos positivos.

### 1.3 — O único `any` de produção do repo
`apps/web/src/components/fechamento-diario/components/detalhamento/DetalhamentoRow.tsx:117`
`const valor = (totais as any)[field]` → `keyof TotaisDetalhamento`. ~3 linhas.
Os outros 6 `any` são idioma de teste (`IS_REACT_ACT_ENVIRONMENT`, mocks) e ficam.

### 1.4 — 2 shims sem importador (7 linhas mortas)
`components/TelaGestaoClientes.tsx` (3 linhas) e `components/TelaConfiguracoes.tsx` (4 linhas) são
pontes de re-export da migração — e o `App.tsx` já importa direto o destino. `git rm`.

### 1.5 — Os 5 aliases fantasma
`tsconfig.json:22-52` declara 10; `vite.config.ts:15-21` resolve 5. `@app/`, `@pages/`,
`@widgets/`, `@features/`, `@entities/` **passam no `type-check` e quebram no build**. Uso hoje:
zero nos cinco.
Acrescentar ao `resolve.alias` do Vite (mantém a intenção FSD do §2) **ou** removê-los do
`tsconfig`. Não as duas.
**Nota:** `@/` já funciona nos dois lados — a onda 5.1 não depende deste item, só ganha opções.
**Portão:** `build` (é ele que pega alias quebrado, não o `type-check`).

### 1.6 — Os goldens entram no compilador
`tsconfig.json` exclui `**/*.golden.spec.ts`: os 3233 testes que decidem se fórmula pode ser
mergeada **nunca passaram pelo `tsc`**. Também fora: `create_*.ts`, `verify_*.ts`, `reset_*.ts`,
`spikes`, `supabase/functions`.
Tirar o glob dos goldens e limpar o que acender. Provavelmente dá trabalho; nada muda de número.
**A onda 2 depende deste item.**

### 1.7 — Exportar `emCentavos` e corrigir o §4 do `CLAUDE.md`
O §4 manda "dinheiro em centavos (inteiro)". **O repo inteiro trabalha em reais-float**,
`packages/utils` incluído, compensando com `emCentavos = Math.round(reais*100)/100`
(`lucro.ts:20`, `planilha-mensal.ts:173`). O único centavo-inteiro real é o parse de entrada do
PWA (`apps/pwa-frentista/src/App.tsx:118,212,239,287-293`).
Converter tudo tocaria ~40 arquivos de dinheiro sem ganho mensurável. **A correção é na regra:**
§4 passa a dizer *"reais em float, quantizados por `emCentavos` na fronteira de saída de toda
fórmula"* — e `emCentavos` vira export de `packages/utils`, porque hoje é privado em dois módulos
e reimplementado à mão em `useCaixaGeralMes.ts:143`.

---

## ONDA 2 — fechar o buraco de teste. Ainda sem mudar número.

O §7 proíbe consolidar duplicação sem teste rodando **contra todas as implementações** — e esse
teste não existe, apesar dos 3233 verdes.

### 2.1 — 🔴 O golden que testa uma cópia da fórmula
`packages/utils/src/estoque-encadeamento.golden.spec.ts` (24 casos, criado em `478fbb5`, 26/08)
**replica** a fórmula ponderada em vez de exercitar
`apps/web/src/services/api/compra.service.ts:117-120`.
Motivo estrutural: `packages/*` não pode importar de `apps/*` (§2). Consequência: ele congela o
tamanho da divergência e **fica verde se alguém mexer no custo dentro de `apps/web`**.
**Saída:** o teste tem de alcançar o código de produção — o que provavelmente significa a fórmula
subir para `packages/utils` primeiro e `compra.service.ts` passar a chamá-la.
**Pré-requisito absoluto de toda a onda 3.**

### 2.2 — Golden para cada uma das 8 reimplementações
Antes de consolidar cada item da onda 3, um teste que exercite **a versão atual e a canônica lado
a lado** e afirme a diferença. §7: divergência conhecida se documenta no teste.
Divergência já medida na de custo: até **R$ 2.582/mês**, R$ 132,69 no ano.

---

## ONDA 3 — consolidar os 8 modelos de lucro. Do risco quase nulo ao alto.

O canônico é `packages/utils/src/lucro.ts`:
`lucro = receita − litros × (custoMedio + despesaOperacionalPorLitro)`, quantizado por
`emCentavos`. **Já tem 6 consumidores validados** — a extração está feita e provada; o que segue é
resíduo.

**Custo de deixar:** o dono vê "Lucro" em 6 telas com 6 números diferentes para o mesmo mês, e
nenhuma diz qual convenção usa.

| ordem | site | desvio |
|---|---|---|
| 3.1 | `registro-compras/hooks/useCalculosRegistro.ts:85-126` | trio completo inline + fallback próprio (`litrosBase = vendidos \|\| comprados`, `:91`) que o canônico não tem |
| 3.2 | `aggregator.service.ts:938` | `receitaBruta − volume × custoTotalL` — **no mesmo arquivo que importa `lucroCombustivel` na linha 428** |
| 3.3 | `services/api/salesAnalysis.service.ts:135,185,188,191,194` | trio completo inline, sem `emCentavos` |
| 3.4 | `vendas/dashboard/hooks/useDashboardVendas.ts:100-111` | `profit = totalVendas − totalCost`, **sem despesa operacional** |
| 3.5 | `estoque/dashboard/components/ResumoFinanceiro.tsx:27` | `estoque × (preco_venda − preco_custo)`, sem despesa, dentro do `.tsx` |
| 3.6 | `analise-custos/hooks/useAnaliseCustos.ts:85-92` | modelo de **markup** (`cost / (1 − margem)`) — 3º modelo de preço |
| 3.7 | `services/aiService.ts:64` | `netProfit = vendas − despesas`, sem custo de produto (auto-declarado "Simplificado") |
| — | `relatorio-diario/hooks/useRelatorioDiario.ts:78-86` | **não é achado**: desvio consciente, declarado no `@remarks:76` |

### 3.8 — Mover o que é fórmula e mora em `apps/`
- **`apps/web/src/utils/calculators.ts` (263 linhas)** — módulo inteiro de fórmula
  (`calcularLitros`, `calcularVenda`, `agruparPorCombustivel`, `calcularTotais`) com **1
  importador** (`useFechamento.ts:20`). Deletion test: se sumir, a lógica reaparece em
  `packages/utils/src/leitura.ts`, que já faz o mesmo. ⚠️ Encosta na zona do revert `0f201ef`.
- `fechamento-diario/services/calculosResumo.ts:112,116` — soma os baldes de cartão à mão
  (`valor_cartao_debito + valor_cartao`) em vez de `cartao()` de `@posto/utils`. Único site que
  ainda faz isso.

### 3.9 — 🔴 MUDA NÚMERO — a ponderada morre
`apps/web/src/services/api/compra.service.ts:117-120` grava `Estoque.custo_medio` com
`(estoqueAtual × custoMédioAtual + litrosNovos × custoNovo) ÷ total` — usa **estoque anterior**,
que a planilha não usa. O canônico é a média do próprio mês.

**A arqueologia removeu o principal receio:** essa fórmula é a **mais velha**, não a alternativa.
Nasceu em `0ef4587` (21/12/2025), num commit cuja mensagem **nem menciona custo**; foi **copiada**
para `compra.service.ts` na modularização `4a908c1` (09/01/2026) com **corpo de commit vazio**; e
está congelada há 7 meses. A canônica veio depois, em `97fee45` (26/07/2026), validada contra a
planilha real. **Nenhum commit dos dois lados cita o outro.** A divergência nunca foi decisão —
não há razão registrada a preservar nem autor a consultar.

Sobrou **1 cópia irmã**: `apps/web/src/services/stockService.ts:88-93` (loja/conveniência, tabela
`Produto.preco_custo` — outro domínio, decidir à parte). A terceira já saiu no PR #58 (`b36fc39`).

**Ninguém importa a ponderada** — o acoplamento é pelo dado gravado. A compilação não quebra;
**o número muda em 5 rotas vivas ao mesmo tempo**, em silêncio: `/analise-custos`,
`/vendas/analise`, `/vendas/dashboard`, `/relatorio-diario`, `/dashboard`.

Leitores que herdam o carimbo e precisam ser conferidos depois:
`aggregator.service.ts:427,804,935-940` · `salesAnalysis.service.ts:102,152,185,197` ·
`useDashboardVendas.ts:103` · `estoque/dashboard/components/ResumoFinanceiro.tsx:16,27` ·
`TabelaResumo.tsx:56,59`.

**Pare e chame o dono.** Não é decisão de refatoração, é decisão de negócio.

---

## ONDA 4 — taxa de cartão. Convenção a decidir, não bug a consertar.

O canônico (`packages/utils/src/lucro.ts:11-12`) é explícito: *"A taxa de cartão NÃO é uma dedução
por transação: ela é apenas mais um item da lista de despesas mensais"*. O dono confirmou em 26/08.
**Três modelos coexistem.** Onde o mesmo fechamento também entra no rateio mensal, a taxa sai duas
vezes do lucro.

- **4.1 — dedução por transação, 3 sites:** `fechamento-diario/hooks/useFechamento.ts:157,166` ·
  `usePagamentos.ts:206` · `usePagamentos.ts:216`.
  ⚠️ *Pode ser legítimo*: "líquido que o frentista entrega" e "lucro do mês" são perguntas
  diferentes. **Decidir com o dono antes de mexer.**
- **4.2 — dupla no app:** `financeiro/hooks/useFinanceiro.ts:254` soma `taxas_pagamento` (carimbo)
  **junto com** `totalDespesasOps` (tabela `Despesa`). Tela viva: `financeiro/index.tsx:44` →
  `fechamento-diario/index.tsx:301`, aba de `/fechamento`.
- **4.3 — dupla no SQL:** `supabase/migrations/20260802_rpc_custo_historico.sql:134` faz
  `lucro_bruto − custo_taxas − total_despesas`, com `1,2%`/`3,5%` **chumbados** em `:106-121`.
  Idem `..._security_definer.sql:115`; sem despesas em `legado/fix_lucro_calculation.sql:60-64,92`.
  Quem ainda ingere: `/fechamento-mensal` (`components/fechamento-mensal/index.tsx:63-64`).
  `useDashboardProprietario.ts:46-52` **já neutraliza** essa RPC de propósito — o comentário de lá
  é a documentação da decisão. Migration versionada, nunca clique no painel (§5).
- **4.4 — as 6 colunas carimbadas.** Lidas por `fechamento.service.ts:236`, consumidas por
  `useFinanceiro.ts:254,260,261,296`, e **nenhuma escrita do app as grava**:
  `custo_combustiveis`, `lucro_bruto`, `lucro_liquido`, `taxas_pagamento`,
  `margem_bruta_percentual`, `margem_liquida_percentual`. Único escritor é
  `scripts/auditoria-lucro-mes.py`, offline.
  **Recomendação: a UI para de lê-las e calcula de `packages/utils`.** Carimbo de dinheiro é o
  mecanismo que gerou metade desta fila.
  Junto disso caem os 3 fallbacks de `useFinanceiro.ts:260-262`, que só disparam quando a RPC
  falha e **discordam do que a RPC calcula**.

---

## ONDA 5 — estrutural. Grande diff, zero risco de número. Por último.

### 5.1 — Os imports relativos profundos: **concentrados**
203 com 3+ níveis; 323 contando `../../`, em 145 dos 413 arquivos. **55% em 6 pastas:**

| ocorrências | diretório |
|---|---|
| 67 | `apps/web/src/services/api` |
| 55 | `components/fechamento-diario/hooks` |
| 20 | `components/fechamento-diario/components` |
| 14 | `components/registro-compras/hooks` |
| 13 | `components/fechamento-diario/components/detalhamento` |
| 12 | `components/registro-compras` |

A árvore `fechamento-diario/**` sozinha responde por 95. Um PR com `sed` de `../../../` → `@/`
resolve mais da metade. **`@/` já funciona** nos dois lados (Vite e tsconfig) e só 7 arquivos de
337 o usam — não é falta de wiring, é inércia.
Custo de deixar: cosmético. Único ganho real: `../../../` quebra em silêncio quando a pasta muda.

### 5.2 — Metas hardcoded (barra de progresso, não fórmula)
`TabGestaoBicos.tsx:57` (`metaLucroGlobal = 60000`, comentário "Meta MOCKADA") · `:211` (`/300000`)
· `fechamento-mensal/index.tsx:89-90` (`60000`, `150000`) · `useCalculoGestaoBicos.ts:83` (`/5000`).

### 5.3 — `strict` e `verbatimModuleSyntax`
Desligados no `tsconfig.json`. Ligar um de cada vez, depois de 1.6.

---

## BLOQUEADO — não é falta de apetite, é o §2

- **Mudança em massa de pasta** (`components/` → FSD), enquanto o replay do banco corre.
  A ordem escrita é: consolidar em `packages/utils` **primeiro**, mover pastas **depois**.
  `git blame` é justamente o que a auditoria precisa intacto agora.
- **kebab-case: 194 arquivos de 413 fora do padrão** (pastas: 100% conformes). O `git mv` em massa
  colide com a proibição acima. Só junto com a mudança de pasta.

### Corrigido nesta rodada: `components/` × `widgets/` **não** tem duplicação
A varredura abriu os arquivos e conferiu par a par. `widgets/` tem 2 fatias, ambas com
`index.ts`/`model/`/`ui/` corretos e ambas consumidas via `@/widgets`. Os pares de nome
(`TabelaLeituras`, `ListaDespesas`, `ResumoFinanceiro`, `ResumoCards`, `FooterAcoes`) têm props e
domínios diferentes — unificar é **Speculative**, a armadilha dos "dois stat cards".
**Dependência FSD invertida: ZERO. Import profundo entre fatias: ZERO.** As regras absolutas do §2
estão intactas. O strangler está funcionando como manda o manual.

---

## Fora de banda

- **`.mcp.json` está sem `--read-only`** — `execute_sql` escreve em produção. Commitado assim em
  13/08 **por decisão do dono**; repor exige perguntar a ele, não é limpeza automática.
- Falso positivo já resolvido: o teto de `~/.claude/settings.json` foi recalibrado para 550 bytes
  em 28/08; o arquivo tem 572 e está íntegro, com todas as travas.

## Não conferido — para ninguém fechar a investigação achando que está completa

- **As ~47 migrations e policies `.sql`** ficaram fora do inventário de `.ts`/`.tsx`. Fórmula em
  RPC/view é território dos agentes `rls` e `schema` — e é relevante, porque
  `get_dashboard_proprietario` calcula custo histórico dentro do banco.
- **Qual das 8 fórmulas acerta.** Foi medido que são distintas, não qual dá o número certo. Isso é
  o agente `planilha`.
- **Qual versão de `get_dashboard_proprietario` está viva no banco** — duas migrations com a mesma
  fórmula. Não muda a conclusão: as duas subtraem taxa e despesa.
- **Se a Lista A de janeiro inclui a fatura da adquirente** — sem isso, a magnitude da dupla
  contagem no replay atual é desconhecida.
- **`apps/pwa-dono`** (14 arquivos, app novo) não foi aberto arquivo por arquivo.

---

# PARTILHA — duas trilhas em paralelo, 28/08/2026

Duas sessões trabalham ao mesmo tempo. **A divisão é por arquivo, não por tarefa** — três arquivos
apareciam nas duas listas e teriam colidido.

| | **FABLE — a parte difícil** | **CLAUDE — a outra** |
|---|---|---|
| árvore | `Posto-Providencia/` (principal) | `Posto-Providencia-estrutural/` (worktree) |
| branch | `refactor/saneamento-formula` | `chore/saneamento-estrutural` |
| natureza | **toca dinheiro** — golden obrigatório em cada PR | **zero dinheiro** — `type-check` limpo é o critério |

## Fila do Fable

1. **1.1 primeiro** — apagar as ~330 linhas mortas do `aggregator.service.ts`. Não é dinheiro, mas
   é *no arquivo dele*: encolhe em um terço o terreno de 0.3, 0.4 e 3.2 antes de começarem.
2. **Onda 0 inteira** (0.1 → 0.5) — os números fabricados. É o trabalho urgente.
3. **Onda 2** — os goldens que faltam, incluindo o `estoque-encadeamento` que testa uma cópia.
4. **Onda 3** — as 8 fórmulas, terminando em 3.9 (🔴 para e chama o dono).
5. **Onda 4** — taxa de cartão (4.1 é decisão do dono antes de mexer).
6. Ao tocar `lucro.ts`, **exportar `emCentavos`** (metade do 1.7).
7. As metas de `fechamento-mensal/index.tsx:89-90` (5.2 parcial, mesmo arquivo do 0.5).

**Arquivos exclusivos do Fable** — ninguém mais escreve neles:
```
packages/utils/src/**
apps/web/src/services/api/{aggregator,salesAnalysis,compra}.service.ts
apps/web/src/services/api/index.ts
apps/web/src/services/{aiService,stockService}.ts
apps/web/src/utils/calculators.ts
apps/web/src/components/fechamento-diario/hooks/**
apps/web/src/components/fechamento-diario/services/calculosResumo.ts
apps/web/src/components/fechamento-diario/components/detalhamento/TabelaConciliacaoFrentistas.tsx
apps/web/src/components/fechamento-mensal/index.tsx
apps/web/src/components/financeiro/**
apps/web/src/components/vendas/dashboard/hooks/useDashboardVendas.ts
apps/web/src/components/registro-compras/hooks/useCalculosRegistro.ts
apps/web/src/components/analise-custos/hooks/useAnaliseCustos.ts
apps/web/src/components/estoque/dashboard/components/ResumoFinanceiro.tsx
supabase/migrations/**
```

## Fila do Claude

1. **1.6 PRIMEIRO e rápido** — tirar `**/*.golden.spec.ts` do `exclude` do `tsconfig.json`.
   **Tem de terminar antes de o Fable escrever o primeiro golden novo**, para ele já nascer sob o
   compilador. Por isso o Fable começa pelo 1.1, que não toca golden nenhum: é a janela.
2. **1.2** — 4 `enum` mortos em `packages/types/src/database/enums.ts`.
3. **1.3** — o único `any` de produção, `DetalhamentoRow.tsx:117`.
4. **1.4** — os 2 shims sem importador.
5. **1.5** — os 5 aliases fantasma (`vite.config.ts`).
6. **1.7** — corrigir o §4 do `CLAUDE.md` (a regra, não o código).
7. **5.3** — `strict` e `verbatimModuleSyntax`, um de cada vez, depois do 1.6.

**Arquivos exclusivos do Claude:**
```
tsconfig.json
vite.config.ts
CLAUDE.md
packages/types/src/database/enums.ts
packages/types/src/database/index.ts
apps/web/src/components/fechamento-diario/components/detalhamento/DetalhamentoRow.tsx
apps/web/src/components/TelaGestaoClientes.tsx
apps/web/src/components/TelaConfiguracoes.tsx
```
⚠️ `DetalhamentoRow.tsx` mora na mesma pasta que o `TabelaConciliacaoFrentistas.tsx` do Fable.
Arquivos diferentes, mas é a única vizinhança apertada da partilha — confira antes de salvar.

## Ninguém faz agora — só depois da convergência

- **5.1, os 203 imports relativos.** Tocam 145 arquivos, incluindo todos os do Fable. Feito agora,
  transformaria cada merge das duas trilhas num conflito.
- **5.2, as metas hardcoded.** Dois dos quatro sites são do Fable; separar não vale o risco.

## Ordem de merge

`chore/saneamento-estrutural` **primeiro** (menor, sem dinheiro), depois
`refactor/saneamento-formula` rebasa em cima. Nenhum dos dois vai para a `main` sem o "ok" do dono.
