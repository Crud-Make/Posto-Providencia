---
name: venda-elias
description: >-
  Prepara a venda do sistema Posto Providência para Elias, o dono do posto.
  Use SEMPRE que o usuário mencionar reunião/conversa/demo com o Elias,
  "vou lá no posto", "vou mostrar o sistema", "preciso fechar contrato",
  "quanto cobrar", "que perguntas eu faço", "me prepara pra vender", ou pedir
  argumento comercial, resposta a objeção ou proposta de preço para o posto.
  Também use quando ele estiver inseguro sobre cobrar, achando que o sistema
  "ainda não está pronto". A skill obriga a consultar o dado real do
  repositório ANTES de escrever qualquer argumento — nenhum número vai pra
  reunião sem vir de arquivo verificável.
---

# Venda para o Elias — Posto Providência

Skill de preparação comercial. O objetivo final não é "mostrar o sistema": é **converter 7 meses de trabalho não remunerado em contrato pago**.

## Contexto fixo (não perguntar de novo)

- **Cliente:** Elias, dono do Posto Providência. Não é técnico. Opera o posto pela planilha há anos.
- **Situação atual:** sem contrato, sem pagamento fixo. Combinado informal: "quando estiver redondinho o Elias contrata". O usuário já pagou a assinatura do Claude Code do próprio bolso, além do tempo.
- **O risco real:** "redondinho" nunca chega sozinho — sempre falta uma feature. Toda preparação de reunião deve empurrar para uma **data e um valor**, não para mais uma demo.
- **Relação é boa:** Elias já validou o trabalho, já confirmou que quer o segundo projeto (app de desconto). Não é venda fria, é conversão de aliado em cliente.
- **Concorrência de contexto:** a rede Arruda dita o preço da região. O app de desconto é a arma competitiva — mas só depois do sistema de fechamento.

## Regra dura: dado antes de argumento

**Nunca escreva um número de reunião de cabeça.** Antes de produzir qualquer briefing, consulte as fontes reais do repositório. Ordem de preferência:

1. `docs/data/posto_jorro_2026.sqlite` — banco de referência do ETL (encerrantes diários, venda por frentista, pagamentos, 7 meses jan–jul/2026)
2. `docs/data/fixture_lucro_custo_mes01.json` — golden master de janeiro (lucro, custo, despesa/litro)
3. `docs/data/janeiro_referencia.sqlite` — banco de referência de janeiro
4. A planilha original — **não fica em `docs/data/`**: está em `~/Downloads/Posto,Jorro, 2026.xlsx` (e `2025.xlsx`). Só abra se os anteriores não bastarem, e **nunca edite** (§6 do CLAUDE.md). O caminho e o hash estão em `.claude/ativos-criticos.json`.

**Não existe `fixture_lucro_custo_7meses.json`** — conferido em 26/08/2026. Despesa/litro dos 7 meses sai do sqlite ou do agente `planilha`, não de um fixture pronto.

Confirme os caminhos com `ls docs/data/` antes de assumir. Se um arquivo não existir, diga isso em vez de inventar. Para número do posto, prefira o agente `planilha` — ele já devolve valor com procedência.

Para cada número que entrar no briefing, registre: **valor, arquivo de origem, query/campo**. Se o usuário for questionado pelo Elias na frente do dashboard, ele precisa saber de onde veio.

Se um número que fortaleceria o argumento não puder ser calculado com o dado disponível, **diga "não dá pra afirmar isso"** e ofereça o que dá. Um argumento falso destrói a venda no primeiro confronto com a planilha do Elias.

## O núcleo da venda: o custo de 2018

O argumento mais forte já está achado — não invente outro melhor, use esse como centro:

> Elias calcula lucro usando **R$ 0,45/litro** de custo operacional. Esse número é o valor histórico fixo de **2018**. A despesa real de 2026, calculada do jeito que o próprio Elias descreve (despesas do mês ÷ litros do mês), fica entre **R$ 0,60 e R$ 0,78/litro** nos 7 meses reais.

Antes da reunião, **recalcule isso do dado atual** e produza:
- despesa/litro real de cada mês (jan–jul)
- o delta contra 0,45
- litros/mês médios
- o **lucro fantasma mensal e anual** = delta × litros

Esse último número é a caneta. Ele é a razão da venda.

## Fluxo de preparação (o que produzir)

Quando a skill dispara, entregue um **briefing de reunião**, nesta ordem, nada mais:

### 1. As três perguntas de abertura
Três perguntas que Elias **não consegue responder de cabeça**, cada uma com a resposta real já calculada do banco. Regenere-as a cada reunião a partir do dado — não repita as mesmas sempre.

Critério de uma boa pergunta:
- resposta existe no banco e sai em segundos no dashboard
- levaria Elias 1h+ na planilha
- é sobre **dinheiro dele**, não sobre tecnologia

Formato de saída:

| Pergunta pro Elias | Resposta real | Fonte |
|---|---|---|
| ... | ... | arquivo + campo |

Instrua o usuário a **fazer as três perguntas antes de abrir qualquer tela** e a ficar em silêncio depois da terceira.

### 2. O golpe
O parágrafo do custo de 2018, com os números recalculados. Escrito em linguagem de dono de posto — sem "hardcoded", sem "fixture", sem "aggregator". Fala-se em litro, despesa, lucro, mês.

### 3. Demo de 90 segundos
Liste **no máximo 3 telas**, e apenas as que respondem as três perguntas da abertura. Nada de tour pelo sistema. Cada tela extra dilui o golpe e abre flanco pra crítica.

**Antes de prometer qualquer tela, confira o estado do banco.** Desde 14/08/2026 a produção está em replay e pode estar parcialmente vazia — tela que abre zerada na frente do Elias mata a reunião. Se o dado do mês não estiver carregado, ou a demo espera, ou se demonstra em cima do mês que está carregado. Isso não é detalhe: é o anti-padrão da demo longa com outro nome.

### 4. O fechamento
Uma proposta concreta com:
- data de início
- valor de implantação + mensalidade
- garantia de saída (ex: 60 dias, cancela e fica com o sistema rodando)
- a frase que encerra a fase gratuita

**Ancoragem obrigatória:** o preço se ancora no buraco encontrado (lucro fantasma/mês), nunca no custo do usuário (assinatura + horas). Se você não souber a faixa de mercado da região, diga que não sabe e entregue a lógica da âncora com o valor em branco pro usuário preencher.

### 5. Objeções previstas
No máximo 4, cada uma com resposta de uma a três frases. Priorize as que o Elias realmente diria: "a planilha funciona", "tá caro", "vou pensar", "meu sobrinho faz".

## Como escrever

- Tudo em pt-BR, tom de conversa de posto, não de proposta comercial.
- Frases curtas. Elias não lê parágrafo longo e não vai ler slide.
- **Zero jargão técnico no que o usuário vai falar.** Jargão pode aparecer só na coluna "Fonte", que é pro usuário, não pro Elias.
- Nada de "solução", "otimizar processos", "transformação digital". Fala-se: falta, sobra, litro, taxa de cartão, fechamento, lucro.
- O usuário não é fornecedor pedindo favor. Ele é a pessoa que achou dinheiro que o Elias não sabia que estava perdendo. O tom do briefing deve refletir isso.

## Anti-padrões (falhas que matam a venda)

- ❌ Abrir o dashboard antes das perguntas → vira venda de software, entra em comparação de preço
- ❌ Demo longa → Elias acha um bug, a conversa vira suporte técnico
- ❌ Falar em features ("fiz o módulo de lucro") → ninguém compra módulo, compram dinheiro achado
- ❌ Pedir desculpa pelo que falta → Elias não sabe o que falta até você contar
- ❌ Sair da reunião sem data e valor → é isso que já aconteceu, é isso que a skill existe pra impedir
- ❌ Número sem fonte → morre no primeiro "cadê isso na minha planilha?"

## Pendências que valem virar pergunta na reunião

Já existem dúvidas abertas de negócio com o Elias. Se ainda não foram respondidas, inclua no briefing como **perguntas de encerramento** (depois do fechamento, não antes):

- IRPJ / CSLL / FGTS / Alvará em branco na planilha: é zero real ou pago por fora sem lançar?
- A taxa de cartão entra rateada no custo por litro do mês, e não por transação — confirmar.
- Existem duas tabelas de despesa na planilha com totais divergentes; Elias já confirmou que **tudo** entra no custo por litro — confirmar que a tabela mais completa é a oficial.

Essas perguntas fazem duas coisas: fecham lacuna técnica e provam pro Elias que o usuário conhece o posto dele melhor do que ele.

## Se o usuário estiver inseguro pra cobrar

Não valide a insegurança e não empurre motivação vazia. Aponte o fato: 7 meses de dado real migrados, ETL validado nos 7 meses, golden master passando, um erro de custo de 8 anos encontrado. Isso não é protótipo. Depois volte pro fechamento — insegurança se resolve com número na mão, não com conversa.
