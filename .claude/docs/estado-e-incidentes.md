# Estado real e incidentes — anexo do CLAUDE.md

> Aqui mora o **porquê**: observações de estado com data, e as histórias que originaram as regras.
> **Regra nenhuma mora aqui** — toda regra está no `CLAUDE.md`, que é o que carrega em toda sessão.
> Este anexo se lê sob demanda, quando a pergunta for "por que essa regra existe?" ou "como isso
> estava em tal data?".
>
> Observação com data **envelhece**. Re-cheque antes de agir; não confie na nota isolada.

---

## Estado da migração FSD (checado 2026-07-26) — §2

O `tsconfig.json` raiz já declara os aliases `@app/@pages/@widgets/@features/@entities/@shared`
apontando pra `apps/web/src/*`, mas só `apps/web/src/shared/ui/` existe (3 arquivos). `app`, `pages`,
`widgets`, `features` e `entities` **não existem ainda**. `apps/web/src` hoje é organizado por tipo
técnico (`components/`, `services/`, `contexts/`, `layouts/`, `utils/`, `types/`).

Aliases são config morta até a primeira pasta real ser criada — não assuma que a migração começou.

## React Compiler (checado 2026-07-26) — §3

**Não está instalado:** nenhum `vite.config.ts` do monorepo tem `babel-plugin-react-compiler`. O que
existe são as regras de lint do `eslint-plugin-react-hooks@7`
(`react-hooks/preserve-manual-memoization` e afins, ligadas em 2026-07-26 como `warn`), que avisam
sobre padrões incompatíveis com o compiler. Elas **não** substituem o compiler — não remova
memoização manual achando que está coberto.

## `strict` e `verbatimModuleSyntax` (checado 2026-07-26) — §4

Ainda ausentes do `tsconfig.json` raiz. Ligar revela uma onda de erros pré-existentes: foi o que
aconteceu ao ligar o ESLint em 2026-07-26, que expôs 150+ problemas em `apps/web`. Trate como
rollout — reporte a contagem real antes de decidir entre `error` e `warn`.

Sobre `any`: ainda há usos no código legado. A redução é gradual e rastreada; é meta a convergir,
não bloqueio retroativo de PR.

## Os 9 aliases de tabela apagados (2026-07-26) — §4

`apps/web/src/types/database/aliases.ts` tinha 9 aliases (`PostoTable`, `FrentistaTable` etc.)
removidos por estarem *never used* — o próprio lint sinalizou na campanha de zerar warnings. Eram
groundwork especulativo para um Data Mapper que nunca chegou a existir.

**Consequência prática:** se o Data Mapper for retomado, comece do zero a partir do uso real em
`services/api/*`. Não reintroduza os aliases apagados.

## TanStack Query (checado 2026-07-26) — §5

**Não está instalado** — nenhuma dependência no monorepo. É o padrão recomendado para data-fetching
novo, mas usá-lo num arquivo é decisão de adoção explícita, não algo que já esteja valendo.

## `docs/data/` e o incidente de dado real (2026-07-29) — §6

O repositório é público no GitHub e continha dado financeiro real do posto no histórico de commits.
O histórico foi reescrito e limpo, e `docs/data/` entrou no `.gitignore`. O diretório continua no
disco, referenciado pelas skills e pelos golden masters — só não vai mais para o git, nem se o repo
virar privado depois.

**A purga não pegou tudo.** Em 29/07 à noite apareceram, fora do ignore:
`spikes/ocr-encerrante/backup-reset-2026-07-26/Fechamento.json` com 162 registros reais
(`total_vendas`, `total_recebido`, `diferenca`), o `FechamentoFrentista.json` com `valor_conferido`
por frentista, três `Leitura.json`, e `enc1.jpg`/`enc2.jpg`/`fototeste.jpg` na raiz. Nada vazou — a
varredura das árvores dos 694 commits alcançáveis não encontra nenhum deles. Estavam untracked, a um
`git add .` de distância. Fechado em `93d94d1`.

**Lição:** a purga cobriu o que estava *versionado*; o que estava só untracked passou batido.

## As branches que divergiram por 20 commits (2026-07-26) — §9

As branches `ocr` e `testes-funcionais` resolveram o **mesmo** bug ("moedas" fora da soma) em
paralelo, por 20 commits, sem nunca se encontrarem. Só foram reconciliadas por sorte no merge
`ffa4630`.

Causa raiz: as regras de processo viviam em `claude.md` minúsculo e `.cursorrules`, nomes que o
Claude Code não carrega automaticamente — regra que não carrega é regra que não existe. Foi o que
motivou migrar tudo para o `CLAUDE.md` exato.

**Daí vem a regra do §9:** antes de trabalho novo numa área com histórico de duplicação, rodar
`git log --oneline --all` e `git branch --all --contains <arquivo>`.

## A exceção ao `push --force` (2026-07-29) — §9

Houve uma reescrita pontual de histórico para remover o dado real do posto commitado por engano no
repo público — resposta ao incidente de segurança, autorizada explicitamente pelo dono. É o **único**
caso; fora dele a proibição não tem exceção.

## Por que o grafo é hipótese e não resposta (2026-07-29) — §12

`graphify affected "conferido()"` afirmou, com confiança total, que só os testes consumiam o módulo
canônico — quando 11 arquivos de `apps/` importavam ele. Um grep de 2 segundos desmentiu.

A causa foi indexar sub-pastas separado e juntar com `merge-graphs`: o merge não re-resolve imports
entre grafos, então as arestas cross-package somem e o `affected` passa a mentir **por omissão**.
Reindexado da raiz numa passada só, o `affected` voltou a acertar (conferido em 29/07: aponta os 11
arquivos, e o que ele cita além disso é relação transitiva de profundidade 2, não erro).

O modo de falha desta ferramenta não é errar visivelmente — é acertar o tom e mentir no conteúdo.

## Por que a tabela de skills mora no CLAUDE.md (2026-07-29) — §13

Ela vivia só numa nota de memória do agente. Nesse mesmo dia a chave de sessão migrou da pasta pai
para a do repo e a memória parou de carregar: a sessão abriu enxergando 0 de 30 notas.

Regra de processo que depende de memória injetada é regra que um dia não existe.

## Faxina de skills (2026-07-29)

10 skills genéricas em inglês (`api-design`, `bug-investigation`, `code-review`, `commit-message`,
`documentation`, `feature-breakdown`, `pr-review`, `refactoring`, `security-audit`,
`test-generation`) foram removidas de `.claude/skills/`: eram cascas de 6 linhas, frontmatter com
`phases: [E]` e corpo vazio, disputando gatilho com as skills reais em pt-BR. Estão em
`~/.claude/skills-quarentena-2026-07-29/`.

As 3 skills de domínio existiam em cópia dupla (pasta pai + projeto). A do projeto virou canônica e
versionada; a da pasta pai virou symlink relativo. Drift entre elas agora é impossível por
construção, não por disciplina.
