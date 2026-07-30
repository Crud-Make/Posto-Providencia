# CLAUDE.md — Posto Providência

> **Fonte de verdade de processo e arquitetura.** Mantida à mão. Só o nome `CLAUDE.md` exato carrega
> automaticamente — regra em outro nome é regra que não existe (foi o que causou o incidente do §9).
> **Regra de domínio** (fórmula, nomenclatura da planilha, ETL) não fica aqui: fica nas skills, §13.
> **O porquê das regras** — estado datado, histórias de incidente — fica em
> [`.claude/docs/estado-e-incidentes.md`](.claude/docs/estado-e-incidentes.md). Leia sob demanda.
> **Versão:** 3.2 · **Idioma:** pt-BR · **Toolchain:** Bun

---

## 0. Regra Zero — leia isto e pare de adivinhar

1. **Tudo em pt-BR.** Código, comentários, commits, UI, logs.
2. **Toolchain é Bun.** Nunca `npm`, `yarn`, `pnpm`. Nunca instale dependência sem me perguntar.
3. **Nunca trabalhe na `main`.** Branch por objetivo, não por micro-correção.
4. **Dúvida de negócio → skill, não intuição.** Entre o que parece certo e a planilha real, **a
   planilha decide**.
5. **Este repo é o sistema TS/React/Supabase.** Não confunda com o **ProvControl** (Laravel, pausado,
   em `../ProvControl`).
6. **Nenhuma fórmula muda sem golden master rodando.** Sem exceção.
7. **Mudanças cirúrgicas, sem abstração prematura.** A skill `karpathy-guidelines` diz *como* mexer
   sem gerar dívida; o §2 diz *pra onde* código novo mira.

---

## 1. Mapa do repositório

```
apps/web              Painel/dashboard do gerente (React 19 + Vite)
apps/pwa-frentista    PWA onde o frentista envia o fechamento pelo celular
packages/types        Tipos compartilhados (inclui os gerados pelo Supabase)
packages/utils        Lógica de domínio pura e compartilhada (fechamento e lucro)
packages/api-core     Cliente Supabase e acesso a dados desacoplado
docs/data/            Fonte auditável LOCAL — gitignored, nunca versionar dado real
```

**Regra estrutural:** cálculo de domínio mora em `packages/utils`. Fórmula dentro de componente, hook
ou service de app é dívida — sinalize antes de replicar.

---

## 2. Arquitetura — Feature-Sliced Design

Organize por **escopo de negócio**, não por tipo técnico.

| Camada     | Responsabilidade                                                              |
| ---------- | ----------------------------------------------------------------------------- |
| `app`      | Inicialização, provedores globais, roteamento                                 |
| `pages`    | Composições de nível de rota                                                  |
| `widgets`  | Blocos de UI complexos e autônomos (header, tabela de fechamento)             |
| `features` | Ações do usuário com valor de negócio (`enviar-fechamento`, `conferir-caixa`) |
| `entities` | Modelos de dados e lógica de domínio (`frentista`, `fechamento`, `bico`)      |
| `shared`   | UI-kit, helpers e clientes de API desacoplados                                |

- **Dependência unidirecional:** camada de cima importa da de baixo, **nunca** o contrário. Import
  lateral entre fatias da mesma camada também é proibido — suba para `widgets`/`pages` para compor.
- **API pública:** cada fatia expõe só o necessário via `index.ts`. Import profundo
  (`features/x/model/interno.ts`) é violação.
- **No monorepo:** `packages/*` é o `shared` do workspace, acima do `shared` de cada app. App importa
  de `packages/*`; `packages/*` nunca importa de app. Domínio compartilhado entre os dois apps vive em
  `packages/utils`/`packages/types`, não duplicado no `entities` de cada um — o `entities` do app é o
  *adaptador de UI* daquele domínio. `apps/web` e `apps/pwa-frentista` **nunca** se importam.
- **Migração é strangler, nunca big-bang.** FSD é obrigatório para código novo e para arquivo tocado
  em refatoração deliberada. Reorganização em massa de pasta é **proibida** enquanto houver validação
  de dado real em curso: destrói `git blame` exatamente onde a auditoria precisa dele. Ordem correta:
  consolidar lógica duplicada em `packages/utils` **primeiro**, mover pastas **depois**.

> Estado da migração (a pasta FSD quase não existe ainda): ver anexo.

---

## 3. React 19 e TSX

Separe **View** de **Lógica**. Componente que calcula dinheiro está errado por definição.

- **Memoização:** o React Compiler **não está instalado** aqui, então `useMemo`/`useCallback` manuais
  continuam válidos. Confira o `vite.config.ts` do app antes de remover memoização existente.
- **`useActionState`** para estado de formulário, erro e pendência. Nada de `isLoading` na mão.
- **Hook `use`** para consumir contexto condicionalmente. Cacheie a promise fora do ciclo de render,
  senão entra em loop de suspensão. Estado de servidor é TanStack Query — não misture os dois no mesmo
  fluxo de dados.
- **Refs:** envolva a atribuição em chaves — `ref={(el) => { ref.current = el }}` — para não devolver
  valor implícito que o React 19 lê como função de limpeza.
- Estado local fica **estritamente próximo do uso**. Não suba estado "por precaução".

---

## 4. TypeScript e modelo de dados

- **`any` é proibido.** Tipo desconhecido → generics `<T>` ou `unknown` com narrowing. Nunca `as any`
  para calar o compilador; o erro do TS é guia, não obstáculo.
- **Sem `enum` do TypeScript.** Emite runtime e briga com `verbatimModuleSyntax` e com os tipos
  gerados do Supabase (que chegam como union de string). Use:
  ```ts
  export const FORMA_PAGAMENTO = ['dinheiro', 'pix', 'credito', 'debito', 'nota_vale'] as const;
  export type FormaPagamento = (typeof FORMA_PAGAMENTO)[number];
  ```
- **Contrato antes da implementação:** defina `interface`/`type` primeiro. `readonly` no que não muda.
- **Tipos gerados:** `database.types.ts` sai da Supabase CLI, nunca escrito à mão. Use `MergeDeep`
  (type-fest) para corrigir Views que o Supabase infere como nulas.
- **Data Mapper na fronteira:** a UI fala camelCase, o banco fala snake_case. A tradução acontece em
  `entities`/`api` **uma vez**, não espalhada. Exceção consciente: fixtures, goldens e artefatos de ETL
  em `docs/data/` preservam o snake_case original — a fonte auditável manda.
- **Dinheiro em centavos (inteiro).** Float só na formatação para exibição.
- Erro de Supabase: `instanceof` sobre `PostgrestError`, não string matching genérico.

> `strict`/`verbatimModuleSyntax` ainda desligados, `any` legado, e os 9 aliases apagados: ver anexo.

---

## 5. Supabase, estado e segurança

- **RLS ativa em todas as tabelas.** Sem exceção, inclusive em tabela nova de teste.
- Nas políticas use `(select auth.uid())`, não `auth.uid()` puro — permite cache por transação.
- **Autenticação por PKCE.**
- **Real-time:** toda subscrição precisa de cleanup no desmonte. Vazamento de canal estoura o limite
  de conexão do projeto.
- **Segredos:** `.env.local` fora do git. `service_role` **jamais** no front, nem em Edge Function
  exposta sem verificação. Só a `anon key` vai para o cliente.
- Migração de esquema é arquivo versionado, nunca clique no painel.

> TanStack Query (v5) é o padrão recomendado para fetching novo, mas ainda **não está instalado**:
> adotá-lo num arquivo é decisão explícita. Ver anexo.

---

## 6. Regras de domínio invioláveis

Detalhe nas skills (§13). O que nunca se reescreve de cabeça:

- `valor_conferido` = soma das formas de pagamento recebidas pelo frentista.
- `diferenca` = **concentrador − conferido**. Positivo = **FALTA**, negativo = **SOBRA**.
- **Custo operacional por litro** = despesas reais do mês ÷ litros vendidos no mês. **Nunca** valor
  fixo hardcoded. **Toda** despesa do posto entra no rateio, sem exceção.
- **`docs/data/` nunca é versionado.** O xlsx original não se edita. Fica no disco, referenciado pelas
  skills e golden masters, fora do git — nem se o repo virar privado depois.
- Toda fórmula aplicada exige **golden master** antes de a tarefa ser considerada pronta.

---

## 7. Testes

- **Golden master:** `bun:test` + `bun:sqlite` contra o banco de referência real. É o teste que decide
  se refatoração de cálculo pode ser mergeada.
- **Unitário/componente:** Vitest, arquivo **ao lado** do código (`fechamento.test.ts`).
- **Nunca consolide implementações duplicadas sem antes ter um teste rodando contra todas elas.**
  Consolidar primeiro e testar depois é como divergência silenciosa entra em produção.
- Divergência conhecida entre planilha e código se **documenta no teste** — não se "conserta" no
  módulo sem decisão explícita minha.

---

## 8. Convenções de arquivo

- **kebab-case** em todo nome de arquivo e pasta.
- **Imports absolutos por alias**: `@/shared/ui`, `@posto/utils`. Nada de `../../../`.
- Teste ao lado do código que testa.
- Um componente por arquivo; nome do arquivo = nome do componente em kebab-case.

---

## 9. Git

- **Conventional Commits:** `feat` `fix` `docs` `chore` `refactor` `test` `style`.
- **1 mudança lógica = 1 commit.** A mensagem descreve o que foi feito, não "ajustes".
- **Branch por objetivo** (`feat/`, `fix/`, `refactor/`, `docs/`). Reutilize para tarefas do mesmo
  contexto; crie nova só para objetivo distinto.
- **Issue vinculada** quando a tarefa for planejada (`feat/#12-descricao`, `feat: descrição (#12)`).
  Spike não bloqueia — mas o achado vira Issue ou entra no `CHANGELOG.md` antes de fechar o assunto.
- **Antes de trabalho novo em área com histórico de duplicação** (ex.: fechamento/`valor_conferido`),
  rode `git log --oneline --all` e `git branch --all --contains <arquivo>` para checar se outra branch
  já mexe no mesmo problema. Já custou 20 commits de retrabalho — ver anexo.
- **`git push --force` é proibido.** Houve uma única exceção documentada, em resposta a incidente de
  segurança (anexo). Fora dela, sem exceção.
- **`CHANGELOG.md`** atualizado a cada bug corrigido ou funcionalidade concluída, seção `[Não Lançado]`.
- **Regra de ouro:** nenhum merge na `main` e nenhum push remoto sem meu "ok" explícito. Fluxo:
  branch → implementar → eu valido em `localhost:3015` → PR → CI verde → merge.
- Antes de refatoração grande: tag ou branch `versao-testada-funcionando-<feature>`.

---

## 10. Documentação de código

JSDoc **onde carrega significado**, não em tudo.

- **Obrigatório:** função que implementa regra de negócio ou fórmula, API pública de fatia
  (`index.ts`), qualquer coisa cujo "porquê" não seja óbvio no código.
- **Proibido:** comentário que repete o nome da função. `/** Retorna o total */ getTotal()` é ruído.
- Ao mudar regra existente, registre **o que mudou e por quê** (com Issue), não só o que ficou.

```ts
/**
 * Apura a diferença de caixa do frentista no dia.
 *
 * @returns Diferença em centavos. Positivo = FALTA, negativo = SOBRA.
 * @remarks Convenção confirmada na planilha real ("Falta." = Venda Concentrador − Venda Frentistas).
 *          Coberto por golden master contra janeiro; não altere sem rodar `bun test`.
 */
```

---

## 11. Como trabalhar comigo

- **Entendimento antes de código.** Lógica confusa → **pare** e proponha refatoração; não empilhe
  camada para contornar.
- **Trade-off explícito:** havendo mais de um caminho, liste ganho e perda de cada um antes de
  escolher. Escolha silenciosa não serve.
- **Discorde de mim** quando eu estiver errado, com o motivo técnico. Concordância automática custa
  caro num sistema que mexe com dinheiro real.
- **Princípio da carta curta:** menos código, mais entendimento. Over-engineering é dívida com juros.
- Antes de mexer em qualquer coisa que calcule dinheiro, diga **o que vai mudar e qual teste cobre**.

---

## 12. Grafo de conhecimento (graphify)

Existe um grafo do codebase em `graphify-out/` (gitignored), reconstruído sozinho por hooks
`post-commit`/`post-checkout` — em background, só AST, sem LLM.

**Esta regra vence qualquer instrução da skill `graphify`:** o grafo é **hipótese, nunca resposta**. A
skill manda responder direto do grafo; aqui não. O ciclo é **grafo localiza → grep/Read confirma → só
o confirmado é reportado**. O que não fechar no grep se reporta à parte, como *não confirmado*. Em
pergunta sobre dinheiro o grafo não tem voz sozinho — a fonte é a skill de fechamento e o arquivo real.
Já mentiu com confiança total uma vez; ver anexo.

- Porta de entrada preferida: o agente `grafo` (`.claude/agents/grafo.md`), que já embute o ciclo.
- **Nunca** indexe sub-pastas separado e junte com `merge-graphs`. Rebuild é da raiz, numa passada:
  `graphify update . --force`.
- Nome de comunidade só vale logo após um `graphify label` — apodrece a cada rebuild. Sem isso, ignore.

---

## 13. Qual skill usar

| Para isto                                    | Use                                                     |
| -------------------------------------------- | ------------------------------------------------------- |
| Regra de negócio, fórmula, nomenclatura      | `fechamento-posto-providencia`                            |
| Importar/atualizar a partir do `.xlsx`       | `etl-planilha-posto-providencia`                          |
| Avaliar ou planejar refatoração              | `refatoracao-posto-providencia`                           |
| "Onde fica X", "quem usa Y", raio de impacto | agente `grafo` (§12)                                      |
| Bug difícil                                  | `mattpocock-skills:diagnosing-bugs`                       |
| Feature test-first                           | `mattpocock-skills:tdd`                                   |
| Revisar o diff da branch                     | `mattpocock-skills:code-review`                           |
| Desenhar módulo ou domínio                   | `mattpocock-skills:codebase-design`, `:domain-modeling`   |
| Planejar trabalho em fases                   | `claude-mem:make-plan` + `:do`                            |
| Recall de sessão anterior                    | `claude-mem:mem-search`                                   |
| Mexer no código sem gerar dívida             | `karpathy-guidelines`                                     |

- **Um pipeline por tarefa, nunca dois.** `claude-mem:make-plan`+`do` e o fluxo do mattpocock são
  ambos pipelines completos de "planeje em fases e execute com subagents" — rodar os dois duplica
  plano e queima token.
- **Não use aqui:** `claude-mem:learn-codebase`, `:smart-explore`, `:pathfinder`. As três leem arquivo
  para entender base desconhecida; este repo já responde isso pelo grafo (§12). Valem em repo sem grafo.
- `find-skills`, `prompt`, `dataviz`: sob demanda, quando eu pedir pelo nome.

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
