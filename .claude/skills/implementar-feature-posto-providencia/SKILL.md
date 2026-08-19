---
name: implementar-feature-posto-providencia
description: Como implementar feature nova no monorepo do Posto Providência — onde o código nasce (slice FSD), o que já está instalado e o que NÃO está, qual teste cobre, e quando parar antes de escrever a primeira linha. Use ao adicionar tela, hook, componente, service, endpoint, tabela ou módulo novo em apps/web, apps/pwa-frentista ou packages/*, e sempre que a pergunta for "onde eu coloco isso?", "como começo essa feature?", "qual padrão sigo aqui?". NÃO use monólito modular genérico (domain/application/infrastructure/interfaces) — não é o padrão daqui. Antes de tocar dinheiro, pare e vá para fechamento-posto-providencia.
---

# Implementar Feature — Posto Providência

Contexto: dev único, monorepo Bun (`apps/web`, `apps/pwa-frentista`, `packages/*`), Supabase.
Otimize para *leverage* — mudança pequena com impacto real —, não para camadas de arquitetura de
time grande. O `CLAUDE.md` manda no processo; esta skill diz **onde o código novo nasce e o que o
segura**.

---

## 1. Padrão-alvo × estado real — confira antes de citar

O padrão-alvo do projeto e o que está instalado **não são a mesma coisa**. Escrever código contando
com ferramenta ausente é o erro mais caro daqui: skill não dá erro, só não corresponde. Estado
conferido no disco em **16/08/2026** — se divergir, reconfira antes de tratar como regressão.

| Item | Padrão-alvo | Estado real (16/08/2026) | O que fazer hoje |
|---|---|---|---|
| **Feature-Sliced Design** | `app → pages → widgets → features → entities → shared` | Aliases `@app/ @pages/ @widgets/ @features/ @entities/ @shared/` existem no `tsconfig.json` da raiz, mas **só `apps/web/src/shared/` existe**. O resto do web é `components/`, `services/`, `contexts/`, `layouts/`, `utils/` | Código **novo** nasce em FSD — criar a pasta pela primeira vez é esperado. Mover código velho em massa é **proibido** (§2) enquanto houver validação de dado real |
| **React Compiler** | Sem `useMemo`/`useCallback` manual | **NÃO instalado.** `vite.config.ts` da raiz é `plugins: [react()]`, sem `babel-plugin-react-compiler` | `useMemo`/`useCallback` manuais **continuam válidos e necessários**. Não remova memoização existente |
| **TanStack Query v5** | Todo estado de servidor | **NÃO instalado.** Ausente do `package.json` | Fetch novo segue o padrão do arquivo vizinho (`useState` + `useEffect` + service). Adotar TanStack é **instalar dependência** → §0.2, pergunte ao dono primeiro |
| **`strict` / `verbatimModuleSyntax`** | Ligados em tudo | Ligados em `packages/*` e `apps/pwa-frentista`. **Desligados em `apps/web`** (herda o `tsconfig.json` da raiz, que não tem `strict`) | Em `packages/*` e no PWA o compilador te protege. Em `apps/web` **não conte com ele** — `bun run type-check` passa em coisa que quebraria sob strict |
| **`type-fest` / `MergeDeep`** | Corrigir Views que o Supabase infere nulas | **NÃO instalado** | Não escreva `MergeDeep` — não compila. Se precisar, é decisão + instalação explícita |
| **Tipos do banco** | Gerados pela Supabase CLI | O gerado existe em dois lugares (`packages/types/src/database.types.ts`, `apps/web/src/types/database/generated.ts`) e **nenhum dos dois tipa o client**. Quem tipa é `apps/web/src/types/database/schema.ts` + `tables/*`, **escrito à mão** | Tabela nova → a mão, em `types/database/tables/<área>.ts`, e registrada no `schema.ts`. Use o gerado para **conferir drift**, não como autoridade — trocar a autoridade é decisão à parte, nunca efeito colateral de feature |

Regra geral desta seção: **se a tabela diz "NÃO instalado", a skill não te autoriza a instalar.**

---

## 2. Pare antes de começar: que tipo de feature é?

| Tipo | Onde o código vai | Golden master |
|---|---|---|
| UI/tela sem cálculo de dinheiro | slice novo em `features/` ou `widgets/` | não |
| Toca `valor_conferido`, `diferenca`, lucro, custo por litro, preço, rateio de despesa | **pare** → skill `fechamento-posto-providencia` antes de escrever qualquer linha | **sim, sempre** (§0.6) |
| Reorganização estrutural sem mudar fórmula | skill `refatoracao-posto-providencia` | não, mas o resultado **não pode mudar** |

Fórmula e estrutura **nunca** vão no mesmo commit. Em conflito entre intuição e o dado real de
`docs/data/janeiro_referencia.sqlite`, o dado real decide.

---

## 3. Fluxo

### 3.1 Onde a feature mora
Decida pelo escopo real, não pelo maior possível:

- Botão/formulário/ação isolada → `features/<nome-da-acao>/` (ex.: `features/conferir-caixa/`)
- Composição de várias features numa área de tela → `widgets/<nome>/`
- Modelo/regra de negócio reusada em mais de um lugar → `entities/<nome>/`
- Utilitário sem estado e sem regra de negócio → `shared/`
- **Cálculo de dinheiro → `packages/utils/`, nunca no slice** (§1 do CLAUDE.md, sem exceção)

Cada slice expõe API pública por `index.ts`; import profundo em slice alheio é violação. Import
lateral entre fatias da mesma camada também — suba para `widgets`/`pages` para compor.

Não crie `entities/` para algo usado uma vez. Comece em `features/` e suba de camada quando um
**segundo** lugar precisar. `apps/web` e `apps/pwa-frentista` nunca se importam; o que os dois
usam mora em `packages/`.

### 3.2 Tipos antes da implementação
Contrato primeiro: `interface`/`type`, `readonly` no que não muda, sem `any`, sem `enum` do TS
(use `as const` + union). Dinheiro em **centavos inteiros**.

Tabela nova ou coluna nova: escreva o tipo à mão em `apps/web/src/types/database/tables/` e
registre no `schema.ts` — é ele que tipa o client (ver §1). Para saber se o que você escreveu bate
com o banco vivo, use o agente `schema`, não o olho.

Data Mapper na fronteira: a UI fala camelCase, o banco fala snake_case. A tradução acontece **uma
vez**, na borda de `entities`/`api`. `snake_case` dentro de componente React é vazamento.

### 3.3 RLS antes do código de UI
Tabela nova sem policy é query que "não retorna nada" e ninguém sabe por quê. Escreva a policy no
arquivo de migration versionado (nunca clique no painel), usando `(select auth.uid())` — não
`auth.uid()` cru, que reavalia por linha.

Confirme a proteção com o agente `rls` **antes** de testar pela tela. O caminho de descoberta pela
UI já custou caro: RLS que barra silenciosamente vira "sucesso com zeros" no app.

### 3.4 Estado de servidor
Hoje: siga o padrão do arquivo vizinho (service em `services/` + hook com `useState`/`useEffect`).
Erro de Supabase se identifica por `instanceof PostgrestError`, não por string matching.

Realtime: **toda** subscrição precisa de cleanup no desmonte. Canal vazado estoura o limite de
conexão do projeto.

### 3.5 Formulário e mutação
`useActionState` para o ciclo pending/erro/sucesso — sem `isLoading` na mão. Refs com atribuição
entre chaves: `ref={(el) => { ref.current = el }}`, senão o React 19 lê o retorno como função de
limpeza.

Componente que calcula dinheiro está errado por definição: o cálculo vem pronto de
`packages/utils`.

### 3.6 Teste — qual runner, e o comando exato
Os dois runners coexistem e **não se misturam**:

- Unitário/componente → **Vitest**, arquivo ao lado do código (`fechamento.test.ts`).
  Comando: `bun run test`
- Golden master → **`bun:test` + `bun:sqlite`**, e só em
  `packages/utils/src/*.golden.spec.ts` — é esse glob que o script roda.
  Comando: `bun run test:golden`

**Nunca `bun test` puro** (§7): ele varre o repo e tenta executar os arquivos de Vitest, onde `vi`
não existe. As falhas que saem daí não são bugs, e já viraram "baseline pré-existente" imaginária
por várias sessões.

Golden gera um teste por linha de dado — a contagem muda sozinha quando o ETL roda. Divergiu?
Reconte antes de chamar de regressão.

### 3.7 Antes de commitar
- [ ] Slice na camada certa, sem import profundo nem lateral
- [ ] Cálculo de dinheiro em `packages/utils`, em centavos, fora de componente
- [ ] Nenhum `snake_case` de banco além da fronteira do mapper
- [ ] Sem `any`, sem `enum` do TS, sem `../../../`
- [ ] RLS escrita, versionada e conferida pelo agente `rls` (se tabela nova/alterada)
- [ ] Memoização **preservada** onde já existia (não há Compiler aqui)
- [ ] Mexeu em fórmula? `bun run test:golden` rodou e passou
- [ ] `bun run test` e `bun run type-check` limpos
- [ ] kebab-case, teste ao lado, tudo em pt-BR
- [ ] `CHANGELOG.md` atualizado, na branch certa (nunca `main`)

---

## 4. Quem consultar em cada etapa

Os 6 agentes do projeto são **somente leitura** e existem porque leem muito e devolvem pouco — é
esse o critério (§13). Use-os assim:

| Etapa | Agente | Pergunta que ele responde |
|---|---|---|
| Antes de criar o slice | `grafo` | Onde isso já existe? O que quebra se eu mexer aqui? |
| Antes de abrir trabalho em área com histórico de duplicação | `historico` | Outra branch já mexe nisso? Por que está assim? |
| Ao escrever/alterar tipo de tabela | `schema` | O tipo bate com o banco vivo? Que migration criou isso? |
| Antes de testar tabela nova pela tela | `rls` | O anônimo alcança isso? A policy segura alguma coisa? |
| Ao conferir qualquer número | `planilha` | Quanto deu de verdade? Qual a fórmula da planilha? |
| Antes de decidir prioridade de refatoração | `conformidade` | Qual o tamanho da dívida aqui? |

**Não monte cadeia de subagentes para implementar.** Subagente que envolve um passo só (implementar,
rodar teste, revisar) **gasta mais** do que fazer direto: paga spawn, instruções e resumo para
economizar nada. Além disso subagente **não herda** a skill invocada nesta sessão nem o que já foi
lido — ele começa com `CLAUDE.md`, git status e o próprio prompt. Planejar, implementar e testar
ficam na thread principal. Revisão de diff é `/code-review`.

---

## 5. Anti-padrões daqui

- **Camadas `domain/application/infrastructure/interfaces` por módulo.** Não é o padrão adotado;
  é fricção sem ganho para dev único. O padrão é FSD.
- **"Nunca modificar arquivo existente".** Foi essa regra que duplicou `valor_conferido`/`diferenca`
  em ~6 lugares. O certo é o inverso: **consolide** com golden master de proteção — e o golden roda
  contra **todas** as implementações antes de você apagar qualquer uma (§7).
- **Reorganizar pasta em massa junto com a feature.** Destrói `git blame` exatamente onde a
  auditoria de dado real precisa dele. Consolidar lógica primeiro, mover pasta depois.
- **Contar com ferramenta da coluna "padrão-alvo".** Compiler, TanStack, `MergeDeep` e `strict` no
  web não existem hoje (§1). Código escrito contra eles não roda.
- **`auth.uid()` sem `(select ...)`** em policy — reavalia por linha.
- **Tipo de banco divergindo em silêncio.** Há três fontes de tipo no repo e só uma é a autoridade.
  Confira com o agente `schema` em vez de assumir.
- **Instalar dependência para "seguir o padrão".** §0.2: nunca sem perguntar.
