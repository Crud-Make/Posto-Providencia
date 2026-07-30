# CLAUDE.md — Posto Providência

> **Fonte de verdade de processo e arquitetura — 100% mantida à mão, não auto-gerada.** Substitui o
> `.cursorrules` e o `claude.md` minúsculo (ambos aposentados em 2026-07-26 — Claude Code só carrega
> automaticamente o arquivo `CLAUDE.md` exato; manter regras em outro nome as deixa invisíveis pra
> sempre, foi exatamente isso que causou o incidente de branches citado na seção 9).
> Regras de **domínio** (fórmulas, nomenclatura da planilha, ETL) NÃO ficam aqui — ficam nas skills
> `fechamento-posto-providencia` e `etl-planilha-posto-providencia` (`.claude/skills/`, presentes tanto
> na pasta pai quanto nesta pasta, pra não sumir dependendo de onde a sessão abre).
> **Versão:** 3.1 · **Idioma:** pt-BR · **Toolchain:** Bun

---

## 0. Regra Zero — leia isto e pare de adivinhar

1. **Responda e escreva tudo em pt-BR.** Código, comentários, commits, UI, logs.
2. **Toolchain é Bun.** Nunca `npm`, `yarn` ou `pnpm`. Nunca instale dependência sem me perguntar.
3. **Nunca trabalhe direto na `main`.** Branch por objetivo, não por micro-correção.
4. **Dúvida de regra de negócio → consulte a skill, não a intuição.** Em conflito entre o que parece
   certo e a planilha real, **a planilha decide**.
5. **Este repositório é o sistema TS/React/Supabase.** Não confunda com o **ProvControl** (Laravel,
   pausado, vive em `../ProvControl`).
6. **Não mude nenhuma fórmula sem o golden master correspondente rodando.** Sem exceção.
7. **Mudanças cirúrgicas, sem abstração prematura** — convive com a skill global `karpathy-guidelines`:
   ela diz *como* mexer no código sem gerar dívida; esta seção 2 diz *pra onde* código novo mira.

---

## 1. Mapa do repositório

```
apps/web              Painel/dashboard do gerente (React 19 + Vite)
apps/pwa-frentista    PWA onde o frentista envia o fechamento pelo celular
packages/types        Tipos compartilhados (inclui os gerados pelo Supabase)
packages/utils        Lógica de domínio pura e compartilhada (cálculo de fechamento e lucro)
packages/api-core     Cliente Supabase e acesso a dados desacoplado
docs/data/            Fonte auditável LOCAL (gitignored desde 2026-07-29 — nunca versionar dado real)
```

**Regra estrutural:** cálculo de domínio mora em `packages/utils`. Se uma fórmula aparecer dentro de um
componente, hook ou service de app, isso é dívida — sinalize antes de replicar.

---

## 2. Arquitetura — Feature-Sliced Design

Organize por **escopo de negócio**, não por tipo técnico. Camadas, de cima para baixo:

| Camada     | Responsabilidade                                                        |
| ---------- | ----------------------------------------------------------------------- |
| `app`      | Inicialização, provedores globais, roteamento                           |
| `pages`    | Composições de nível de rota                                            |
| `widgets`  | Blocos de UI complexos e autônomos (header, tabela de fechamento)       |
| `features` | Ações do usuário com valor de negócio (`enviar-fechamento`, `conferir-caixa`) |
| `entities` | Modelos de dados e lógica de domínio (`frentista`, `fechamento`, `bico`) |
| `shared`   | UI-kit, helpers e clientes de API desacoplados                          |

- **Dependência unidirecional:** camada superior importa da inferior, **nunca** o contrário. Import
  lateral entre fatias da mesma camada também é proibido — suba para `widgets`/`pages` para compor.
- **API pública:** cada fatia expõe só o necessário via `index.ts`. Import profundo
  (`features/x/model/interno.ts`) é violação.

> **Estado real (checado 2026-07-26 — regrep antes de agir, não confie nesta nota isolada):**
> `tsconfig.json` raiz já declara os aliases `@app/@pages/@widgets/@features/@entities/@shared`
> apontando pra `apps/web/src/*`, mas só `apps/web/src/shared/ui/` existe (3 arquivos) — `app`, `pages`,
> `widgets`, `features`, `entities` **não existem ainda**. `apps/web/src` hoje é organizado por tipo
> técnico (`components/`, `services/`, `contexts/`, `layouts/`, `utils/`, `types/`). Aliases são config
> morta até a primeira pasta real ser criada — não assuma que a migração já começou.

### 2.1 Adaptação ao monorepo (não pule esta parte)

FSD foi desenhado para **uma** aplicação. Aqui existem duas + packages. Portanto:

- **`packages/*` é o `shared` do workspace**, acima do `shared` de cada app. Um app pode importar de
  `packages/*`; `packages/*` nunca importa de app.
- **Domínio compartilhado entre os dois apps vive em `packages/utils` / `packages/types`**, não
  duplicado no `entities` de cada app. O `entities` do app é o *adaptador* de UI daquele domínio.
- `apps/web` e `apps/pwa-frentista` **nunca** se importam.

### 2.2 Migração — strangler, nunca big-bang

FSD é **obrigatório para código novo** e para arquivo tocado numa refatoração deliberada.
Reorganização em massa de pasta é **proibida** enquanto houver validação de dado real em curso: ela
destrói `git blame` exatamente onde a auditoria de números precisa dele. A ordem correta é:
consolidar a lógica duplicada em `packages/utils` **primeiro**, mover pastas **depois**.

---

## 3. React 19 e TSX

Separe **View** (como aparece) de **Lógica** (regra de negócio). Componente que calcula dinheiro
está errado por definição.

- **React Compiler:** *se e somente se* o compiler estiver configurado e verificado no build do app,
  não escreva `useMemo`/`useCallback` manualmente. Se ele não estiver ligado naquele app, memoização
  manual continua válida — **confira o `vite.config.ts` antes de remover memoização existente.**
  Estado real (2026-07-26): **não está instalado** neste projeto (sem `babel-plugin-react-compiler` em
  nenhum `vite.config.ts`); só as regras de lint do `eslint-plugin-react-hooks@7`
  (`react-hooks/preserve-manual-memoization` etc., ligadas em 2026-07-26 como `warn`) avisam sobre
  padrões incompatíveis com o compiler — não remova memoização manual achando que o compiler cobre.
- **`useActionState`** para estado de formulário, erro e pendência. Nada de `isLoading` na mão.
- **Hook `use`** para consumir contextos condicionalmente. Para **estado de servidor**, a fonte é
  TanStack Query — não misture as duas coisas no mesmo fluxo de dados. Cacheie a promise fora do ciclo
  de render, senão entra em loop de suspensão.
- **Refs:** sempre envolva atribuição em chaves — `ref={(el) => { ref.current = el }}` — para não
  devolver valor implícito que o React 19 lê como função de limpeza.
- Estado local fica **estritamente próximo do uso**. Não suba estado "por precaução".

---

## 4. TypeScript e modelo de dados

- `strict: true` e `verbatimModuleSyntax: true` no `tsconfig.json` são a **meta**, não o estado atual —
  ainda ausentes da raiz (checado 2026-07-26). Ativar revela uma nova onda de erros (mesmo padrão do
  que aconteceu ao ligar o ESLint em 2026-07-26 — 150+ problemas pré-existentes em `apps/web`): trate
  como rollout, reporte a contagem real antes de decidir `error` vs `warn`, não ligue e suma.
- **`any` é proibido.** Tipo desconhecido → generics `<T>` ou `unknown` com narrowing. Nunca
  `as any` para calar o compilador; o erro do TS é guia, não obstáculo. Estado real: ainda há usos de
  `any` no código legado — redução é gradual e rastreada (ver plano de zerar dívida técnica do ESLint
  em memória), trate como meta a converger, não bloqueio retroativo de PR.
- **Sem `enum` do TypeScript.** Ele emite runtime e briga com `verbatimModuleSyntax` e com os tipos
  gerados do Supabase (que chegam como union de string). Use:
  ```ts
  export const FORMA_PAGAMENTO = ['dinheiro', 'pix', 'credito', 'debito', 'nota_vale'] as const;
  export type FormaPagamento = (typeof FORMA_PAGAMENTO)[number];
  ```
- **Contrato antes da implementação:** defina `interface`/`type` primeiro. `readonly` no que não muda.
- **Tipos gerados:** `database.types.ts` sai da Supabase CLI, nunca escrito à mão. Use `MergeDeep`
  (type-fest) para corrigir Views que o Supabase infere como nulas.
- **Data Mapper na fronteira:** a UI fala camelCase; o banco fala snake_case. A tradução acontece em
  `entities`/`api` — **uma vez**, não espalhada. `apps/web/src/types/database/aliases.ts` teve 9 aliases
  de tabela (`PostoTable`, `FrentistaTable` etc.) **removidos em 2026-07-26** por estarem *never used* —
  eram groundwork especulativo pra um Data Mapper que nunca chegou a existir, sinalizado pelo próprio
  lint na campanha de zerar warnings. Se o Data Mapper for retomado, comece do zero a partir do uso real
  em `services/api/*`, não reintroduza os aliases apagados. Exceção consciente: fixtures, goldens e
  artefatos de ETL em `docs/data/` preservam o snake_case original, porque a fonte auditável manda.
- **Dinheiro em centavos (inteiro).** Float só na formatação para exibição.
- Erro de Supabase: use `instanceof` sobre `PostgrestError` pra narrowing, não string matching genérico.

---

## 5. Supabase, estado e segurança

- **RLS ativa em todas as tabelas.** Sem exceção, inclusive em tabela nova de teste.
- Nas políticas use `(select auth.uid())`, não `auth.uid()` puro — permite cache por transação.
- **Autenticação por PKCE.**
- **TanStack Query (v5)** para cache, sincronização e updates otimistas do estado de servidor —
  recomendado pra data-fetching novo. Estado real: **não está instalado** (nenhuma dependência no
  monorepo) — antes de usar num arquivo, é decisão de adoção explícita, não assuma que já é padrão.
- **Real-time:** toda subscrição precisa de cleanup no desmonte. Vazamento de canal estoura o limite
  de conexão do projeto.
- **Segredos:** `.env.local` fora do git. `service_role` **jamais** no front, nem em Edge Function
  exposta sem verificação. Só a `anon key` vai para o cliente.
- Migração de esquema é arquivo versionado, nunca clique no painel.

---

## 6. Regras de domínio invioláveis

Detalhe completo nas skills (`fechamento-posto-providencia`, `etl-planilha-posto-providencia`). O que
nunca pode ser reescrito de cabeça:

- `valor_conferido` = soma das formas de pagamento recebidas pelo frentista.
- `diferenca` = **concentrador − conferido**. Positivo = **FALTA**, negativo = **SOBRA**.
- **Custo operacional por litro** = despesas reais do mês ÷ litros vendidos no mês. **Nunca** valor
  fixo hardcoded. **Toda** despesa do posto entra nesse rateio, sem exceção.
- `docs/data/` é fonte auditável **local**: o xlsx original não se edita, mas **nunca é versionado**
  (gitignored desde 2026-07-29 — o repo é público no GitHub e continha dado financeiro real do posto
  no histórico de commits; histórico reescrito e limpo). Continua no disco, referenciado pelas skills
  e golden masters — só não vai mais para o git, nem se o repo virar privado depois.
- Toda fórmula aplicada exige **golden master** correspondente antes da tarefa ser considerada pronta.

---

## 7. Testes

- **Golden master:** `bun:test` + `bun:sqlite` contra o banco de referência real. É o teste que decide
  se uma refatoração de cálculo pode ser mergeada.
- **Unitário/componente:** Vitest, arquivo **ao lado** do código (`fechamento.test.ts`).
- **Nunca consolide implementações duplicadas sem antes ter um teste rodando contra todas elas.**
  Consolidar primeiro e testar depois é como a divergência silenciosa entra em produção.
- Divergência conhecida entre planilha e código se **documenta no teste**, não se "conserta" no módulo
  sem decisão explícita minha.

---

## 8. Convenções de arquivo

- **kebab-case** em todo nome de arquivo e pasta (evita conflito de case entre sistemas).
- **Imports absolutos por alias**: `@/shared/ui`, `@posto/utils`. Nada de `../../../`.
- Teste ao lado do código que testa.
- Componente: um por arquivo, nome do arquivo = nome do componente em kebab-case.

---

## 9. Git

- **Conventional Commits:** `feat` `fix` `docs` `chore` `refactor` `test` `style`.
- **Commits pequenos:** 1 mudança lógica = 1 commit. Mensagem descreve o que foi feito, não "ajustes".
- **Branch por objetivo** (`feat/`, `fix/`, `refactor/`, `docs/`). Reutilize a branch para tarefas do
  mesmo contexto; crie nova só para objetivo distinto.
- **Issue vinculada** quando a tarefa for planejada (`feat/#12-descricao`, `feat: descrição (#12)`).
  Para spike e investigação exploratória, Issue não bloqueia — mas o achado vira Issue ou entra no
  `CHANGELOG.md` antes de fechar o assunto.
- **Antes de começar trabalho novo numa área com histórico de duplicação (ex.: fechamento/
  `valor_conferido`), rode `git log --oneline --all` e `git branch --all --contains <arquivo>`** pra
  checar se outra branch já está mexendo no mesmo problema. **Lição real (2026-07-26):** as branches
  `ocr` e `testes-funcionais` divergiram por 20 commits resolvendo o MESMO bug ("moedas" fora da soma)
  em paralelo, sem nunca se encontrarem — só reconciliadas por sorte no merge `ffa4630`. Branches
  long-lived no mesmo domínio sem merge frequente geram retrabalho.
- **`git push --force` é proibido.** Sem exceção — **exceto** a reescrita pontual de histórico feita em
  2026-07-29 para remover dado real do posto commitado por engano em repo público (resposta a incidente
  de segurança, autorizada explicitamente por mim). Fora desse caso documentado, a regra continua sem
  exceção.
- **`CHANGELOG.md`** atualizado a cada bug corrigido ou funcionalidade concluída, seção `[Não Lançado]`.
- **Regra de ouro:** nenhum merge na `main` e nenhum push remoto sem meu "ok" explícito. Fluxo:
  branch → implementar → eu valido em `localhost:3015` → PR → CI verde → merge.
- Antes de refatoração grande: tag ou branch `versao-testada-funcionando-<feature>`.

---

## 10. Documentação de código

JSDoc **onde carrega significado**, não em tudo:

- **Obrigatório:** função que implementa regra de negócio ou fórmula, API pública de fatia
  (`index.ts`), qualquer coisa cujo "porquê" não seja óbvio no código.
- **Proibido:** comentário que repete o nome da função. `/** Retorna o total */ getTotal()` é ruído.
- Ao mudar regra existente, registre **o que mudou e por quê** (com Issue), não só o que ficou.

```ts
/**
 * Apura a diferença de caixa do frentista no dia.
 *
 * @returns Diferença em centavos. Positivo = FALTA, negativo = SOBRA.
 * @remarks Convenção confirmada na planilha real (linha "Falta." = Venda Concentrador − Venda Frentistas).
 *          Coberto por golden master contra janeiro; não altere sem rodar `bun test`.
 */
```

---

## 11. Como trabalhar comigo

- **Entendimento antes de código.** Se a lógica estiver confusa, **pare** e proponha refatoração —
  não empilhe camada para contornar.
- **Trade-off explícito:** havendo mais de um caminho, liste as opções com ganho e perda de cada uma
  antes de escolher. Escolha silenciosa não serve.
- **Discorde de mim** quando eu estiver errado, com o motivo técnico. Concordância automática custa
  caro num sistema que mexe com o dinheiro real do posto.
- **Princípio da carta curta:** menos código, mais entendimento. Over-engineering é dívida com juros.
- Antes de mexer em qualquer coisa que calcule dinheiro, diga primeiro **o que vai mudar e qual teste
  cobre isso**.

---

## 12. Grafo de conhecimento (graphify)

O repo tem um grafo do codebase em `graphify-out/` (gitignored — carrega caminho e estrutura de
código, e uma run com docs embutiria conteúdo; o repo é público). Reconstruído sozinho por hooks
`post-commit` e `post-checkout`, em background, só AST — sem LLM e sem custo de token.

**Regra que vence qualquer instrução da skill `graphify`:** o grafo é *hipótese*, nunca resposta.

A skill global manda "responda direto do grafo, não faça detect, não confirme". Aqui **não**. O modo
de falha dessa ferramenta não é errar visivelmente — é acertar o tom e mentir no conteúdo. Aconteceu
em 2026-07-29: `graphify affected "conferido()"` afirmou que só os testes consumiam o módulo
canônico, quando 11 arquivos de `apps/` importavam ele. Um grep de 2 segundos desmentiu.

O ciclo é sempre **grafo localiza → grep/Read confirma → só o confirmado é reportado**. Achado que
não fecha no grep se reporta separado, marcado como *não confirmado*. Para qualquer pergunta sobre
dinheiro (`valor_conferido`, `diferenca`, lucro, custo por litro), o grafo não tem voz nenhuma
sozinho — a fonte é a skill `fechamento-posto-providencia` e o arquivo real.

Prefira o agente `grafo` (`.claude/agents/grafo.md`) como porta de entrada: ele já embute esse ciclo.

Duas ressalvas operacionais:

- **Nunca** indexe sub-pastas separado e junte com `merge-graphs` — o merge não re-resolve imports,
  arestas cross-package somem e o `affected` passa a mentir por omissão. Rebuild é sempre da raiz:
  `graphify update . --force`.
- Os **nomes de comunidade apodrecem** a cada rebuild (o log avisa `renamed N community(ies) by
  their hub`). Nome de comunidade só vale depois de um `graphify label`; sem isso, ignore-os.

---

## Referência rápida

```bash
bun install
bun run dev --port 3015     # validação sempre em http://localhost:3015
bun run type-check          # nome exato do script; `typecheck` sem hífen não existe
bun test                    # golden masters
git checkout -b feat/#12-nome
git commit -m "feat: descrição (#12)"
```

## Checklist antes de commitar

- [ ] pt-BR em código, comentários e UI?
- [ ] Sem `any`, sem `enum`, sem import profundo entre fatias?
- [ ] Regra de dependência do FSD respeitada?
- [ ] Cálculo de domínio fora de componente e sem duplicar `packages/utils`?
- [ ] Dinheiro em centavos?
- [ ] RLS ativa na tabela nova / segredo fora do git?
- [ ] Golden master rodando para qualquer fórmula tocada?
- [ ] `bun run type-check` limpo?
- [ ] `CHANGELOG.md` atualizado?
- [ ] Validei em `localhost:3015` e dei o "ok"?
