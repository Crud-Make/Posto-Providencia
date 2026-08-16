# CLAUDE.md — Posto Providência

> **Fonte de verdade de processo e arquitetura.** Mantida à mão. Só o nome `CLAUDE.md` exato carrega
> automaticamente — regra em outro nome é regra que não existe (foi o que causou o incidente do §9).
> **Regra de domínio** (fórmula, nomenclatura da planilha, ETL) não fica aqui: fica nas skills, §13.
> **O porquê das regras** — estado datado, histórias de incidente — fica em
> [`.claude/docs/estado-e-incidentes.md`](.claude/docs/estado-e-incidentes.md). Leia sob demanda.
> **Versão:** 3.3 · **Idioma:** pt-BR · **Toolchain:** Bun

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
  se refatoração de cálculo pode ser mergeada. Rode **`bun run test:golden`**.
- **Unitário/componente:** Vitest, arquivo **ao lado** do código (`fechamento.test.ts`). Rode
  **`bun run test`**.
- **Nunca rode `bun test` puro.** O runner nativo do Bun varre o repo inteiro e tenta executar os
  arquivos de Vitest, onde `vi` não existe — saem 4 falhas e 2 erros que **não são bugs**. Isso já
  custou uma "baseline de falhas pré-existentes" imaginária, carregada por várias sessões. Suíte
  saudável em **12/08/2026: 393 golden + 171 vitest, zero falhas**. Os números
  anteriores (287 + 30) ficaram nesta linha até apodrecerem — **a contagem vem
  datada por isso**. O golden gera um teste por linha de dado, então ele muda
  sozinho quando o ETL roda: divergiu, reconte antes de chamar de regressão.
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
- **Se o `graphify` sumir da máquina** (já aconteceu; ver anexo), reinstalar é:
  ```bash
  sudo -A pacman -S --needed uv          # uv vem do repo oficial; sem pip/pipx aqui
  uv tool install "graphifyy[sql]"       # PyPI: graphifyy (2 "y"); CLI: graphify (1 "y")
  graphify extract . --code-only         # só AST, local, sem chave de LLM
  graphify cluster-only . --no-label     # gera GRAPH_REPORT.md + graph.html
  graphify hook install                  # post-commit/post-checkout + driver de merge
  ```
  O extra `[sql]` não é opcional: sem ele os ~47 arquivos `.sql` (migrations e policies de RLS)
  ficam de fora do grafo em silêncio. `--code-only` é o que garante o "sem LLM" desta seção.
  **Nunca** rode `graphify install` nem `graphify claude install`: os dois escrevem uma seção
  dentro deste `CLAUDE.md` e instalam um hook `PreToolUse` próprio — este arquivo é mantido à mão,
  e a instrução que eles injetam ("responda direto do grafo") é exatamente a que o §12 revoga.

---

## 13. Qual skill usar

| Para isto                                    | Use                                                     |
| -------------------------------------------- | ------------------------------------------------------- |
| Regra de negócio, fórmula, nomenclatura      | `fechamento-posto-providencia`                            |
| Tela/hook/módulo novo: onde nasce, o que segura | `implementar-feature-posto-providencia`                |
| Importar/atualizar a partir do `.xlsx`       | `etl-planilha-posto-providencia` — **nunca** a `xlsx`      |
| Avaliar ou planejar refatoração              | `refatoracao-posto-providencia`                           |
| "Está pronto?", "pode entregar?", "falta o quê?" | `entrega-real-posto-providencia`                      |
| "Onde fica X", "quem usa Y", raio de impacto | agente `grafo` (§12)                                      |
| "Quanto deu X?", conferir número contra o real | agente `planilha`                                       |
| "Essa tabela está protegida?", exposição do banco | agente `rls`                                         |
| "Isso está no padrão?", tamanho da dívida    | agente `conformidade`                                     |
| "O tipo bate com o banco?", `.sql` vs catálogo | agente `schema`                                         |
| "Alguém já mexeu nisso?", "dá pra recuperar?" | agente `historico`                                       |
| Revisar o diff da branch                     | `/code-review` (embutido)                                 |
| Limpar o que já escrevi, sem caçar bug       | `/simplify` (embutido)                                    |
| Varrer a branch por risco de segurança       | `/security-review` (embutido)                             |
| Feature nova inteira, do zero ao review      | `/feature-dev` (plugin oficial, instalado 16/08)          |
| Mexer no código sem gerar dívida             | `karpathy-guidelines`                                     |
| Buscar em base de notas indexada             | `engraph:engraph` (plugin, instalado 05/08)               |
| Gráfico ou dashboard                         | `dataviz` (embutido), sob demanda                         |

**Conferido em 07/08/2026: `claude-mem` e `mattpocock-skills` NÃO estão instalados.** Não há
rastro em `~/.claude/plugins/`, e nenhum marketplace configurado.

> **Corrigido em 16/08/2026 — a segunda metade desta frase apodreceu.** O marketplace
> `claude-plugins-official` se auto-instalou (`officialMarketplaceAutoInstalled: true` no
> `~/.claude.json`) com 60+ plugins no catálogo, e ficou com **zero** deles instalado. É o §14 ao
> contrário: lá a instrução sobrevive à ferramenta que sumiu; aqui a ferramenta chegou e a
> instrução não soube. `mattpocock-skills` está nesse catálogo — as 6 linhas removidas acima podem
> voltar com um `claude plugin install`, e quem repuser **repõe a linha na tabela no mesmo commit**.
> Instalado dele até agora: só `/feature-dev` (3 agentes, ~238 tok always-on). Seis linhas desta tabela
apontavam para eles — `:diagnosing-bugs`, `:tdd`, `:code-review`, `:codebase-design`,
`:domain-modeling`, `:make-plan`+`:do`, `:mem-search` —, e foram removidas. É a mesma falha do
§12 e do MCP do Supabase: **a instrução sobreviveu à ferramenta**. Reconferir com
`python3 .claude/hooks/testa-hooks.py`, que passou a cobrar isso (§14).

- Sem eles, o substituto de cada um: bug difícil e feature test-first vão no fluxo normal, com o
  golden master (§7) fazendo o papel do test-first; revisão de diff é `/code-review`; desenho de
  módulo é a skill `refatoracao-posto-providencia` mais o agente `grafo`. Se você quiser os
  originais de volta, instale o marketplace e **reponha a linha aqui no mesmo commit** — tabela
  que cita ferramenta ausente é pior que tabela sem a linha.
- **Um pipeline por tarefa, nunca dois.** Deixou de ser hipótese em 16/08: `/feature-dev` é o
  pipeline completo de "planeje em fases e execute com subagents" desta máquina, e é o único.
  O `superpowers`, no mesmo catálogo oficial, é um segundo — instalar os dois duplica plano e
  queima token. Escolher outro significa **desinstalar este**, não somar.
- **A skill `xlsx` (instalada 16/08) não vale para a planilha do posto.** Ela dispara por
  descrição em "qualquer arquivo de planilha", inclusive no exemplo literal *"the xlsx in my
  downloads"* — que é o caminho exato da nossa. Três motivos para a precedência ser da
  `etl-planilha-posto-providencia`, sempre: (1) a postura padrão dela é **editar e recalcular** o
  workbook, e o §6 diz que o xlsx original não se edita; (2) as 3 guardas do nosso ETL vieram de
  bug real nesta planilha e ela não as conhece; (3) o nosso estágio 1 lê o `.xlsx` com **`zipfile`
  da stdlib**, sem dependência alguma, enquanto a `xlsx` pressupõe `openpyxl`, `pandas`,
  `markitdown` e LibreOffice — **nenhum dos quatro existe nesta máquina** (conferido 16/08). Ela
  serve para planilha de fora do posto; para a nossa, é a skill errada com a ferramenta ausente.
- **Não use, se um dia forem instaladas:** skills que leem arquivo para entender base
  desconhecida (`learn-codebase`, `smart-explore`, `pathfinder` e equivalentes). Este repo já
  responde isso pelo grafo (§12). Valem em repo sem grafo.
- **As 6 linhas de agente desta tabela são automáticas**: o hook `roteia-consulta`
  encaminha sozinho (§14) — as 3 primeiras desde 02/08, as 3 últimas desde 07/08. A tabela
  vira conferência, não memória. Agente novo sem rota é reprovado por
  `testa-hooks.py`, que lê `.claude/agents/` do disco e cobra rota para cada um.
- **Os 6 têm memória versionada** (`memory: project` → `.claude/agent-memory/<nome>/`,
  liberada no `.gitignore`). A regra é a mesma em todos: **grava-se o comando, nunca o
  resultado dele.** Contagem, total e "X de Y" em memória são a armadilha do §12 com
  endereço novo — verdadeiros quando escritos, mentira quando lidos. Toda entrada é datada.
- **A memória automática da sessão mora em `.claude/memoria/`**, versionada, e
  `~/.claude/projects/<slug>/memory` é um **symlink** para lá (desde 07/08/2026). É a
  memória que o harness carrega sozinho a cada início — antes vivia só naquele caminho,
  fora do repo: sem git, sem blame, sem backup. Terceira repetição do acidente do `docs/`,
  e a mais silenciosa, porque perder a máquina perderia onde está a planilha fonte e o
  estado do ETL. Um lugar só, versionado, carregamento automático intacto.
  **Clone novo precisa refazer o symlink** — sem ele a memória não carrega, e nada avisa.
  Valor novo do posto não entra aí: para isso vale o §6, e `docs/data/` segue fora do git.
- **Ligar `memory:` habilita `Write`/`Edit` à revelia do campo `tools:`** — é como a
  Anthropic implementa, e não se desliga omitindo a ferramenta. Sem trava, o "somente
  leitura" dos 6 vira promessa vazia; quem devolve a garantia é o hook `memoria-somente`
  (§14), que confina a escrita ao diretório de memória do próprio agente.
- **A skill de domínio vai no frontmatter, não no corpo.** Subagente **não herda** skill
  invocada na sessão nem nada que já foi lido — só `CLAUDE.md`, git status e o próprio
  prompt. `skills:` injeta a skill inteira e é o que transforma "consulte a skill" (torcer)
  em "a skill está no contexto" (garantia). **Dois ficam sem `skills:`, e os dois de
  propósito** — a ausência é decisão, não esquecimento, e está escrita aqui para ninguém
  "consertar" depois: o `rls` porque fechamento não decide pergunta de exposição de banco,
  e o `historico` porque a pergunta dele é sobre o **git**, não sobre o domínio: quem mexeu,
  quando entrou, dá pra recuperar. Nos dois, carregar a skill seria token gasto em ruído.

**Quando vale abrir um subagente:** só quando ele **lê muito e devolve pouco**. O `grafo` carrega um
grafo de 2,5 MB e greps em 305 arquivos para devolver 10 linhas com `arquivo:linha` — aí o ganho é
real. Subagente que envolve um comando só **gasta mais** que fazer direto: paga spawn, instruções e
resumo para economizar nada. Por isso não existe agente de rodar teste — `bun test` sai em 146 linhas,
abaixo do ponto de equilíbrio. Todo agente novo carrega a regra anti-alucinação do seu domínio, como o
`grafo` carrega "grep confirma antes de afirmar".

---

## 14. Travas automáticas

Regras deste arquivo que deixaram de depender de eu lembrar delas. Rodam como hooks
(`.claude/settings.json` → `.claude/hooks/`), executados pelo harness.

**Travas — impedem o erro** (`PreToolUse`):

- Escrita em `docs/data/` — **negada** (§6), tanto por `Write`/`Edit` quanto por shell
  (`>`, `rm`, `sed -i`, `DELETE`…). Leitura segue livre. Para consultar, agente `planilha`.
- `git push --force` — **negado** (§9).
- `git commit` na `main` — **pergunta** antes (§0.3), em vez de bloquear: commit de
  emergência continua possível, mas consciente.
- `git commit` com pendência do checklist — **pergunta** antes: fórmula no commit sem
  golden master (§0.6) ou código sem `CHANGELOG.md` (§9). Inspeciona o índice do git,
  nunca a mensagem — é o que o imuniza contra o falso positivo que mordeu o `protege-git`.
- Escrita fora de `.claude/agent-memory/<nome>/` **vinda de um agente com memória** —
  **negada** pelo hook `memoria-somente`, declarado no frontmatter de cada agente (não
  no `settings.json`: vale só para quem o declara). Devolve o "somente leitura" que
  `memory:` tinha furado. Conclusão que exige mudar arquivo vira **patch na resposta**.
- **Ferramenta mutante do MCP do Supabase — negada** por lista `deny` em
  `.claude/settings.json`: `apply_migration`, `deploy_edge_function` e os cinco `*_branch`.
  Não é redundância com o `--read-only` do `.mcp.json`: **medido em 07/08, o flag não remove
  nenhuma ferramenta** (as mesmas 20 com e sem ele), só restringe a execução do `execute_sql`.
  Sem a `deny`, o `apply_migration` seria um caminho de DDL aberto contra produção — que é
  exatamente o risco que o agente `rls` documentava como "sem trava técnica".

**Encaminhamentos — evitam o desperdício** (`UserPromptSubmit`, `PostToolUse`, `SessionStart`):

- Pergunta de localização, de valor real, de exposição do banco, de conformidade com as
  convenções, de drift de esquema ou de história do git → **encaminhada ao agente**
  `grafo`/`planilha`/`rls`/`conformidade`/`schema`/`historico`. Existe por uma
  assimetria: *skill se oferece, agente não*. Skill
  carrega sozinha pelo casamento com a `description`; agente precisa ser chamado pelo nome,
  e por isso o `grafo` passou de 29/07 a 02/08 instalado e nunca usado. Casamento **forte** de
  propósito — termo solto do domínio não dispara, porque a skill de fechamento já cobre.
- Edição em arquivo de fórmula (`packages/utils/src/*.ts`, `aggregator.service.ts`) → lembra
  do golden master (§0.6) **na hora da edição**, não no fim da tarefa. Erra para o lado do
  aviso a mais: aviso sobrando é uma linha, aviso faltando é fórmula mudando calada.
- Início de sessão → confere cache órfão de plugin, grafo desatualizado, symlink de skill
  quebrado, **fonte auditável ausente**, **plugin fantasma** e **MCP sem `--read-only`**.
  **Silencioso quando está tudo ok** — aviso que aparece sempre deixa de ser lido.

  As três últimas entraram em 07/08, e as três pelo mesmo motivo — **a instrução sobrevive
  à ferramenta, e o sumiço é silencioso**:
  - `docs/data/` sumiu do disco e nada avisou; como é gitignored, o `git status` fica limpo
    enquanto os 5 golden masters estouram e o §0.6 bloqueia toda fórmula.
  - `claude-mem` e `mattpocock-skills` sumiram e **6 linhas do §13 seguiram apontando** para
    elas. Skill ausente não dá erro: só não carrega. O detector considera plugin todo
    `` `prefixo-com-hifen:algo` `` citado neste arquivo — o hífen separa nome de plugin de
    palavra solta em pt-BR, sem lista negra para caçar. Plugin de nome sem hífen escapa, e
    isso é escolha: aqui o aviso guarda documentação, não dinheiro, então erra para o
    silêncio. No `portao-golden`, que guarda dinheiro, a escolha é a oposta.
  - o `--read-only` do `.mcp.json` sai à mão para uma janela de escrita e **o passo de
    devolver é o que se esquece**. Enquanto está fora, `execute_sql` escreve em produção, e
    o arquivo é versionado — não commitar nesse estado.

Instrução é forte; hook é garantia. Regra cara demais para depender de memória vira hook.
Mexeu em hook? Rode **`python3 .claude/hooks/testa-hooks.py`** — 89 casos, e os negativos
valem tanto quanto os positivos. Para revisar ou desligar: `/hooks`.

---

## Referência rápida

```bash
bun install
bun run dev --port 3015     # validação sempre em http://localhost:3015
bun run type-check          # nome exato do script; `typecheck` sem hífen não existe
bun run test                # Vitest — unitários e de componente
bun run test:golden         # golden masters (NUNCA `bun test` puro — ver §7)
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
