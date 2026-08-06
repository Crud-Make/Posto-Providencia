---
name: refatoracao-posto-providencia
description: Use esta skill sempre que for propor, avaliar ou planejar uma refatoração de código no monorepo do Posto Providência — arquivos grandes demais, lógica duplicada, componente misturando fetch/cálculo/view, ou qualquer pedido do tipo "isso tá certo?", "como organizar isso melhor", "vale a pena refatorar X". Ela define o vocabulário de diagnóstico (seam, leverage, locality, deletion test), a escala de confiança (Strong / Worth exploring / Speculative), e a regra mais importante do processo: refatoração estrutural (organização) e mudança de fórmula (cálculo de dinheiro) são categorias separadas e NUNCA devem ser misturadas na mesma tarefa sem golden master. Consulte também fechamento-posto-providencia e etl-planilha-posto-providencia para regras de domínio financeiro.
---

# Refatoração — Posto Providência

## Regra central: organização ≠ correção

Toda refatoração se encaixa em uma de duas categorias, e a categoria decide o processo:

1. **Estrutural (organização/manutenção)** — mover código de lugar, separar responsabilidades, extrair componente/hook, sem mudar nenhum output ou fórmula. Critério de pronto: type-check limpo + valores exibidos idênticos a antes.
2. **De domínio (fórmula/cálculo de dinheiro)** — qualquer mudança que toque em `valor_conferido`, `diferenca`, `projectedProfit`, `totalizers`, lucro, custo, metas, ou qualquer aritmética de negócio. Exige golden master (teste contra dado real, ver `fechamento-posto-providencia`) ANTES de a tarefa ser considerada pronta — nunca depois.

**Nunca misture as duas na mesma tarefa.** Se uma refatoração estrutural expõe uma fórmula sem teste (ex.: promovendo `projectedProfit` pra `packages/utils` pra reuso), isso automaticamente vira categoria 2 e precisa de golden master antes do merge — mesmo que a intenção original fosse só organizar.

Quando o pedido for ambíguo ("vamos organizar esse componente"), pergunte ou confirme explicitamente: "isso é só mover código de lugar, ou vamos mudar/expor alguma fórmula também?" — a resposta muda o processo inteiro.

## Vocabulário de diagnóstico

Ao investigar um arquivo/módulo candidato a refatoração, descreva o problema usando estes termos (não invente outros):

- **Seam (costura)**: um ponto de separação testável entre partes do código. Falta de seam = não dá pra testar uma parte sem montar/rodar as outras.
- **Leverage (alavancagem)**: quantos lugares uma mudança afeta. Alta leverage = 1 correção resolve N call sites (bom motivo pra extrair).
- **Locality (localidade)**: onde uma mudança futura provável vai precisar acontecer. Baixa locality = mudar uma regra de negócio hoje exige tocar em vários arquivos.
- **Deletion test (teste de deleção)**: pergunte "se eu apagar este código, o que quebra e onde a lógica vai reaparecer?". Se a resposta é "vai ser reescrita em outro lugar", é sinal de que o código já merece virar módulo compartilhado.
- **Módulo profundo vs. raso**: módulo profundo = interface pequena escondendo implementação grande (bom). Módulo raso = interface ≈ implementação, não vale a abstração.
- **Vazamento (leak)**: quando uma responsabilidade (fetch, cálculo, formatação) vaza pra dentro de uma camada que não deveria carregá-la (ex.: fórmula de lucro dentro de um componente React).

## Escala de confiança dos candidatos

Classifique cada candidato de refatoração em uma dessas três, e ordene o trabalho pela confiança, não pela vontade:

- **Strong**: segue um padrão já validado em produção no mesmo domínio (tem "irmãos" que já fizeram a mesma extração), baixo risco, ganho imediato e claro.
- **Worth exploring**: ganho real, mas escopo maior, mais arquivos afetados, ou depende de confirmar algo (ex.: dois adaptadores visuais parecidos que podem ou não ser o mesmo conceito).
- **Speculative**: unificação ou abstração hipotética — só uma instância existe hoje, não force generalização antes de haver um segundo caso real.

Não promova um candidato "Worth exploring" pra "Strong" só por impaciência; e não bloqueie um "Strong" esperando decidir os outros.

## Processo passo a passo

1. **Diagnosticar** o arquivo/módulo usando o vocabulário acima — nomear o vazamento específico, não só dizer "tá bagunçado".
2. **Achar os "irmãos"** — módulos do mesmo domínio que já passaram pelo mesmo tipo de refatoração. Copiar a forma validada é sempre Strong; inventar uma forma nova é Worth exploring pra baixo, no mínimo.
3. **Separar candidatos por categoria** (estrutural vs. domínio) antes de ordenar por prioridade.
4. **Ordenar**: Strong estrutural primeiro (menor risco, ganho imediato) → Worth exploring estrutural → qualquer candidato de domínio só depois de golden master escrito → Speculative fica registrado mas não vira tarefa até haver um segundo caso real.
5. **Escopo por PR**: uma extração de hook/componente = uma PR. Trocar formatadores ou consolidar lógica duplicada que toca em 10+ arquivos é sempre uma PR separada — nunca side-quest dentro de uma refatoração menor.
6. **Critério de pronto**:
   - Estrutural: type-check limpo, output/render idêntico, arquivo reduzido de tamanho de forma mensurável.
   - Domínio: golden master passando antes do merge, não depois.

## Erros a evitar (observados em sessões reais)

- Mover uma fórmula de dinheiro pra dentro de um hook/módulo novo achando que "só reorganizou", quando na verdade só mudou a fórmula de endereço sem testá-la (ainda sem golden master, o risco financeiro continua).
- Unificar dois componentes visuais parecidos (ex.: dois "cards de estatística") só porque parecem duplicados — se representam conceitos diferentes ou só existe uma instância de cada, é Speculative, não Strong.
- Misturar uma refatoração estrutural pequena com uma troca de escopo grande (ex.: trocar formatador local por um canônico que afeta 13 arquivos) na mesma tarefa.
- Escrever golden master DEPOIS de mover a fórmula, em vez de antes — a ordem importa porque o teste serve pra provar que a extração não mudou o número, não só que o número "parece certo" hoje.

## Referências relacionadas

- `fechamento-posto-providencia` — regras de golden master, fórmulas de `valor_conferido`/`diferenca`, onde ficam os testes.
- `etl-planilha-posto-providencia` — regras de extração e importação a partir do `.xlsx`. É sobre como o dado ENTRA no banco, não sobre a fórmula: quando a dúvida for "qual é o cálculo certo", a fonte é `fechamento-posto-providencia`; quando for "quanto deu esse número no real", é o agente `planilha`.
- `CLAUDE.md` do monorepo — regras estruturais gerais (FSD, cálculo de domínio em `packages/utils`, convenções de nomenclatura). Esta skill assume essas regras mas não as substitui; em caso de conflito, o `CLAUDE.md` do repo decide.
