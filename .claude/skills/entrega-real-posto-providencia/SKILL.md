---
name: entrega-real-posto-providencia
description: >-
  Auditoria de prontidão — decide se uma feature, uma branch ou o sistema
  inteiro do Posto Providência é PROTÓTIPO ou ENTREGÁVEL, através de 3
  perguntas de veredito sustentadas por 5 varreduras obrigatórias e, para
  cálculo crítico, pelo backtest histórico mês a mês contra a planilha. Use
  SEMPRE que aparecer a palavra "pronto", "terminei", "acabou", "tá
  funcionando", "pode mostrar pro dono", "vamos entregar", "finalizar", "MVP",
  "falta pouco" ou "quase" — e também antes de qualquer merge na main, antes
  de apresentar qualquer tela ao dono do posto, ao planejar o que ainda falta
  para o sistema sair do laboratório, e ao montar replay/backtest de período
  real. Existe para impedir que "quase pronto" vire uma mentira confortável:
  se qualquer varredura falhar, o veredito é PROTÓTIPO, sem exceção e sem
  meio-termo.
---

# Entrega Real — Auditoria de Prontidão

> **Objetivo:** impedir que "quase pronto" vire uma mentira confortável.
>
> Todo projeto parece pronto pra quem construiu. O teste real é se ele
> sobrevive ao uso de **outra pessoa**, com **dado real**, num **dia ruim**.
>
> Aqui isso não é abstrato: o sistema conta dinheiro de frentista. Um número
> errado sem aviso não gera um bug — gera uma acusação de furto contra alguém
> que não deve nada, ou um furto que passa batido.

## Regra de invocação

**Nunca aceite a palavra "pronto" sem rodar as 5 varreduras.** Vale para
quando o dono diz e vale para quando **eu** ia dizer. Se qualquer uma falhar,
o veredito é **PROTÓTIPO**, não ENTREGÁVEL — sem exceção, sem "mas já tá
quase".

Escopo da auditoria é declarado antes de começar: uma feature, uma branch,
ou o sistema inteiro. Auditar sem escopo definido produz veredito
inauditável.

---

## Fonte de verdade — a planilha

A planilha do posto é o **núcleo de toda essa operação**. Não é "mais uma
referência": é a fonte única de verdade, e toda regra de auditoria desta skill
se resolve a partir dela.

- **Bateu, dia a dia, campo a campo → o número está validado.** Para a
  Varredura 2 não é preciso nenhuma outra prova além dessa.
- **Divergiu → o padrão é revisar o sistema, não a planilha.** A planilha
  reflete o que o negócio realmente viveu; o sistema é a interpretação nova,
  ainda sendo provada. Em conflito, a planilha decide, e a investigação começa
  pela lógica do sistema.
- **Exceção rara:** se, depois de revisar a fundo, ficar **comprovado** que a
  própria planilha tinha erro de lançamento manual — a razão de existir o
  sistema novo, em primeiro lugar —, isso vira exceção pontual documentada no
  teste (§7 do CLAUDE.md: divergência conhecida se documenta, não se
  "conserta" calada). Exige **prova concreta do erro**, não suposição. Sem
  prova, toda divergência é falha do sistema até o contrário ser demonstrado.

> **O que esta seção não faz:** bater com a planilha resolve o **número**
> (V2). Não substitui a V3 (alguém de fora usou), nem a V4 (a dor foi curada).
> Sistema com todos os números certos que o dono não usa sozinho continua
> PROTÓTIPO.

Caminho de consulta: o agente `planilha`, que lê `docs/data/*.sqlite` e abre o
`.xlsx` só quando a pergunta é sobre a fórmula. Nunca a intuição, nunca abrir
`docs/data/` na mão.

## Varredura 1 — Escopo pedido vs. escopo entregue

Liste o que foi pedido **originalmente**, mesmo que combinado informalmente
(conversa, mensagem, memória). Neste repo as fontes do "pedido original" são,
nesta ordem: a Issue vinculada, o `CHANGELOG.md` (seção `[Não Lançado]`), a
memória em `.claude/memoria/`, e o histórico da conversa.

Para cada item da lista, marque:

- **Existe no sistema?** Não confundir "existe na minha cabeça o plano de
  fazer" com "existe implementado". Plano não é entrega, e SQL escrito e não
  aplicado também não é.
- **Funciona do jeito que a pessoa pediu**, ou foi simplificado sem avisar?
- Se algo foi **cortado** do escopo original, isso foi **comunicado**, ou está
  escondido esperando alguém notar?

Qualquer item pedido e não entregue — ou entregue diferente do combinado, sem
aviso — **já derruba** o veredito de ENTREGÁVEL.

> Armadilha específica deste repo: "está pronto, só falta aplicar a migration"
> é escopo **não entregue**. Ver a memória `rls-fase1-em-andamento`: SQL
> pronto e não aplicado deixa o banco exatamente tão exposto quanto antes de
> escrever o SQL.

## Varredura 2 — Validação com dado real, não dado de exemplo

Cálculo, fórmula ou lógica de negócio só conta como validado se foi testado
com **números reais do negócio** — não com dado fictício "bonito" que o
desenvolvedor inventou pra caber na lógica.

- Existe pelo menos um caso **golden master**: entrada real conhecida →
  resultado esperado conferido manualmente **por quem entende o negócio**, não
  por quem escreveu o código?
- O resultado do sistema **bate** com esse golden master?

Se ainda não existe esse caso de referência, ele **precisa ser criado antes**
de qualquer veredito de pronto. Sem golden master não existe prova, só
opinião — e o CLAUDE.md §0.6 já trata isso como bloqueio, não como sugestão.

**Como se roda aqui:**

```bash
bun run test:golden     # golden masters contra o banco de referência real
bun run test            # Vitest — unitários e de componente
bun run type-check
```

`bun test` puro é proibido (§7): o runner nativo varre o repo e falha nos
arquivos de Vitest, produzindo uma "baseline de falhas" imaginária. O golden
gera um teste por linha de dado, então a contagem **muda sozinha quando o ETL
roda** — divergiu? Reconte antes de chamar de regressão.

## Varredura 3 — Teste de uso real, não "roda no meu ambiente"

"Funciona pra mim" não é prova de nada. A pergunta certa é: **alguém que não
é quem construiu conseguiu usar sozinho, sem explicação por trás do ombro?**

- Alguém fora do desenvolvimento (o dono, um frentista, um usuário real) já
  usou **sem ajuda**?
- O que essa pessoa **travou, estranhou ou fez diferente** do esperado?

Se ninguém de fora testou ainda, isso é **item pendente obrigatório**, não um
detalhe de polimento.

### Protocolo prático — feature por feature, com dado real, simulando o dono

É a forma concreta de rodar as Varreduras 2 e 3 **ao mesmo tempo**, sem
esperar o sistema inteiro estar pronto pra começar a validar. Assim que uma
feature existir, testa ela sozinha, antes de seguir pra próxima:

1. **Escolhe um dia real de operação já acontecido** — uma data específica,
   com números que o dono confirma de cabeça ou tem anotado em algum lugar
   (caderno, planilha antiga, memória). Nada de dado inventado só pra "caber"
   na lógica.
2. **Roda a feature com esse dado real do jeito que o dono faria** — sem
   atalho de desenvolvedor. Nada de editar direto no banco, pular etapa de
   tela, ou digitar o valor já "arrumado" pra facilitar. Se o dono passa por
   5 telas até chegar lá, você passa pelas mesmas 5 telas. Validação é em
   `http://localhost:3015`, pela UI, no PWA do frentista quando a feature for
   dele.
3. **Compara o resultado do sistema com o que realmente aconteceu naquele
   dia.** Bateu? Marca a feature como validada com dado real. **Não bateu?
   Para ali e investiga** antes de validar a próxima — não empilha feature
   nova em cima de cálculo que ainda não provou estar certo.
4. **Sempre que possível, deixa o próprio dono testar a feature uma vez**, sem
   ninguém do lado guiando o clique. O que ele travar, estranhar ou perguntar
   nesse momento é **dado real de usabilidade** — vale mais que qualquer teste
   feito por quem construiu o sistema.

Feature validada assim, uma por uma, **já é** o processo de entrega pro dono —
não é uma etapa separada que vem depois de "tudo pronto". Quando todas as
features tocadas passarem por esse protocolo, a Varredura 3 está
automaticamente coberta, e não sobra susto pra apresentação final.

> Cuidado com data escolhida: dia com dado de teste no banco não serve de
> referência (ver memória `leituras-suspeitas-26-27-julho`). Confirme a
> procedência do dia antes de usá-lo como verdade.

## Varredura 4 — Resolve o problema humano de verdade

Rodar tecnicamente não é o mesmo que resolver o problema que motivou o pedido
em primeiro lugar.

- Qual era a **dor original** da pessoa antes do sistema existir — tempo
  perdido, erro recorrente, retrabalho, falta de controle?
- Depois do sistema, essa dor específica **diminuiu de verdade**, ou o sistema
  só **digitalizou o mesmo problema** com uma cara nova?

Se a resposta for "tecnicamente funciona, mas a pessoa ainda faz do jeito
antigo por medo/costume/desconfiança", o problema **não foi resolvido** — foi
só construído um sistema **ao lado** do problema.

### Exemplo aplicado — fechamento de caixa

A pergunta certa **não** é "os números batem com a planilha". É:

- O dono já lança direto no sistema, **sem manter o processo manual antigo em
  paralelo "por garantia"**?
- O sistema **aponta erro de digitação antes de salvar**, ou deixa passar e o
  erro só aparece depois, escondido no resultado final?

O gargalo que motivou o pedido era o lançamento manual sujeito a erro. A
feature só resolveu esse gargalo **quando o dono confia o bastante pra
abandonar o método antigo** — não quando o cálculo isolado parece certo num
teste.

### Critério de confiança — medido no uso real

Depois de um período contínuo de uso (referência: **uma a duas semanas de
fechamentos reais**), conte quantas **correções manuais foram necessárias por
falha do sistema**. Erro de digitação do usuário não entra na conta — mas o
sistema deveria tê-lo barrado antes de salvar, então erro de digitação que
passou **conta como falha do sistema**.

- **Zero correções por falha do sistema no período** → sinal de que a feature
  virou ENTREGÁVEL.
- **Qualquer correção por falha do sistema, mesmo uma só** → essa feature
  específica ainda é **PROTÓTIPO**, mesmo que o cálculo pareça certo
  isoladamente.

## Varredura 5 — Comportamento sob falha

Sistema pronto não é o que funciona no caminho feliz — é o que se comporta de
forma **previsível quando algo sai errado**.

- O que acontece com dado **errado, faltando, duplicado ou fora do padrão**
  esperado?
- O sistema **avisa claramente** que algo está errado, ou **falha
  silenciosamente** e deixa a pessoa confiando num número errado?

**Falha silenciosa em cálculo — número errado sem aviso — é o pior cenário
possível.** Pior que travar, porque ninguém percebe até já ter causado dano.

Casos que este projeto já viu e que servem de roteiro mínimo de teste:

- rótulo inesperado no dado de entrada abortando a carga em silêncio (mês 07,
  `Posto - Jorro`);
- timestamp em UTC convertido para local, jogando cada leitura um dia para
  trás;
- dado de teste indistinguível de dado real dentro do banco;
- registro faltando no meio do mês — o total soma menos e **não reclama**.

Para cada um: o sistema **grita** ou **engole**? Engoliu = PROTÓTIPO.

---

## Protocolo de backtest histórico — coordenação multiagente

Para feature de **cálculo crítico** — lucro, encerrante, qualquer número que o
dono vai confiar sem conferir —, a validação feature-por-feature **não basta**.
O teste definitivo é o **replay de todo o período real já vivido**, dia por
dia, comparando o que o sistema calcula com o que realmente aconteceu.

### Pré-condição de segurança — não pular

O reset e o replay acontecem **sempre num banco de teste isolado**, nunca no
banco de produção se o dono já estiver usando o sistema de verdade. Resetar
produção por engano apaga histórico real **sem volta**. **Confirme o ambiente
antes de qualquer reset.**

> **Estado em 13/08/2026: esse banco de teste não existe.** Há um único
> projeto Supabase (`--project-ref` no `.mcp.json`), `.env.example` só tem
> placeholder, e não há stack local do Supabase CLI. Enquanto for assim, o
> replay contra banco **não pode rodar** — a pré-condição é item bloqueante da
> V1, não ressalva de rodapé. Confira também, antes de começar: o
> `--read-only` de volta no `.mcp.json` e `apply_migration` na lista `deny` de
> `.claude/settings.json` (§14). Sem os dois, `execute_sql` escreve em
> produção — que é exatamente o acidente que esta pré-condição existe pra
> impedir.

### Escopo

- **Golden dataset:** a planilha real, pela seção *Fonte de verdade* — na
  prática, `docs/data/posto_jorro_2026.sqlite` (ano extraído pelo ETL), com o
  `.xlsx` como recurso quando a dúvida for de fórmula.
- **Banco de teste resetado do zero.**
- **Replay dia a dia**, do início do período disponível (1º de janeiro) até o
  mês corrente, simulando a inserção do fechamento **exatamente como o dono
  faria**.

### Coordenação entre agentes

Um agente **coordenador** divide o trabalho **por mês** — um subagente por mês,
em paralelo. Cada subagente-mês:

1. Lê os dados reais da planilha para cada dia daquele mês.
2. Insere/simula o fechamento no sistema de teste, **em ordem cronológica**, do
   jeito que o dono inseriria.
3. Compara, dia a dia, **lucro** e **encerrante** produzidos pelo sistema
   contra o valor real da planilha.
4. Registra cada divergência: **dia exato, campo (lucro ou encerrante), valor
   esperado (planilha) vs. valor obtido (sistema)**.
5. Devolve ao coordenador o relatório do mês: quantos dias bateram, quantos
   falharam, detalhamento de cada falha.

O **coordenador não recalcula nada** — só consolida os relatórios num veredito
único, mês a mês e no total.

**Detalhes que este repo cobra:**

- Um subagente por mês cabe no critério do §13 ("lê muito, devolve pouco"): lê
  um mês inteiro de dado e devolve um relatório curto.
- **Subagente não herda skill nem contexto da sessão.** O prompt de cada
  subagente-mês precisa carregar sozinho o mês, o caminho da fonte e a regra de
  comparação — ou nasce adivinhando.
- Módulos e goldens que já existem para os dois campos:
  `packages/utils/src/lucro.ts` + `lucro.golden.spec.ts`,
  `encerrante-mensal.ts` + `encerrante-mensal.golden.spec.ts`, mais
  `lucro-real`, `custo-historico` e `fechamento`. O backtest **não substitui**
  esses goldens — ele estende a cobertura de dia isolado para o período todo.
- O **mês 07 aborta a carga** pelo rótulo `Posto - Jorro` (memória
  `estado-etl-estagio2`). O replay vai bater nisso; é falha conhecida a
  resolver, não motivo pra pular o mês.

### Regra de veredito, sem meio-termo

Se **todo dia, em todo mês** do período replicado bateu exatamente com a
planilha em **lucro** e em **encerrante** → a aplicação está **PRONTA** para
essa feature.

Se **qualquer dia** falhar em lucro ou encerrante — mesmo um único dia, mesmo
diferença pequena — a aplicação **NÃO está pronta**, e o relatório final lista
exatamente **quais dias e qual campo** falharam, virando a lista de correção.

**Não existe "bateu 95% dos dias" como aprovação.** Lucro e encerrante errados
em qualquer dia são o tipo de erro que o dono não perdoa depois de ter
confiado.

---

## Veredito final

Antes de escrever qualquer veredito, responda **três perguntas, nesta ordem,
sem pular nenhuma**:

1. **Por que esse sistema existe** — qual era o problema real antes dele? Se
   essa resposta não estiver clara, nenhuma varredura técnica importa, porque
   não dá pra saber o que "pronto" significa.
2. **O que foi construído resolve o gargalo que motivou o pedido**, ou só
   reproduz o mesmo problema com interface nova? As Varreduras 1 e 4 e o
   Protocolo prático são a evidência que sustenta a resposta — não é opinião
   de quem construiu.
3. **A dor foi curada de verdade** — o dono já não sente mais o que sentia
   antes (a ansiedade de errar, o retrabalho, a desconfiança no próprio
   caixa)? Só se comprova com uso real, não com demonstração: é o que a
   Varredura 3 e o critério de confiança da V4 medem.

**Essas três respostas é que dão o veredito.** As 5 varreduras e os protocolos
não são o objetivo final — são a prova que sustenta a resposta com honestidade,
em vez de achismo.

- **PROTÓTIPO** — qualquer uma das três perguntas ainda não tem resposta
  comprovada. Demonstra o conceito, prova que a ideia funciona, mas ainda não é
  seguro colocar na mão de alguém pra uso diário sem supervisão. Liste
  exatamente **o que falta pra virar ENTREGÁVEL, em ordem de prioridade**, com
  a varredura de origem de cada item.
- **ENTREGÁVEL** — as três perguntas têm resposta clara e comprovada: existe
  motivo definido, o gargalo foi resolvido de fato (não só tecnicamente), e a
  dor foi curada no uso real. Passou nas 5 varreduras, foi testado por alguém
  de fora, tem golden master validado **contra a planilha**, e se comporta de
  forma segura quando algo sai errado. Pode ir pra produção e pro nome de quem
  construiu.

**Nunca existe meio-termo do tipo "98% pronto" como veredito final.** Ou as
três perguntas têm resposta comprovada, ou ainda é protótipo. **"Quase" é
sempre PROTÓTIPO até provar o contrário.**

### Formato do relatório

```
ESCOPO AUDITADO: <feature | branch | sistema>

P1 Por que o sistema existe ......... <resposta em uma linha>
P2 Resolve o gargalo? ............... SIM | NÃO — <evidência>
P3 A dor foi curada? ................ SIM | NÃO — <evidência de uso real>

V1 Escopo pedido vs. entregue ....... PASSA | FALHA — <evidência>
V2 Dado real / golden master ........ PASSA | FALHA — <evidência>
V3 Uso por alguém de fora ........... PASSA | FALHA — <evidência>
V4 Dor humana resolvida ............. PASSA | FALHA — <correções por falha
                                       do sistema no período: N>
V5 Comportamento sob falha .......... PASSA | FALHA — <evidência>

BACKTEST (só cálculo crítico) ....... N/A | <dias ok>/<dias totais> por mês

VEREDITO: PROTÓTIPO | ENTREGÁVEL

Falta pra virar ENTREGÁVEL (prioridade):
1. [V<n> | P<n>] <item>
2. ...
```

**Evidência é comando rodado, arquivo:linha ou número conferido** — nunca
impressão. "Parece que sim" é FALHA, porque o custo de errar aqui é dinheiro
de outra pessoa. Não sei ≠ passa.
