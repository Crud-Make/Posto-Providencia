---
name: fechamento-posto-providencia
description: >-
  Fonte de verdade do domínio de fechamento de caixa do Posto Providência
  (monorepo Bun, apps/web + apps/pwa-frentista + packages/utils, Supabase).
  Use SEMPRE que houver dúvida sobre regra de negócio, cálculo, nomenclatura
  ou estrutura do fechamento ("como calcula X?", "de onde vem esse
  valor/nome", "qual é a fórmula certa"), ao mexer em qualquer lugar que
  calcule `valor_conferido`/`diferenca` (PWA, hooks do web, services,
  aggregator), ou ao mexer no módulo canônico packages/utils/src/fechamento.ts
  e nos 11 arquivos que o consomem. Em conflito entre intuição e
  o dado real de janeiro (docs/data/janeiro_referencia.sqlite), o dado real
  decide. Toda fórmula aplicada exige teste golden master correspondente
  antes de a tarefa ser considerada pronta — e NUNCA consolide as
  implementações duplicadas sem antes ter o teste rodando contra todas elas.
---

# fechamento-posto-providencia — domínio + regra de refatoração segura

Posto Providência é sistema real de gestão de posto de combustível (uso do
dono, dado real). O núcleo é o **fechamento de caixa diário**: conferência do
que cada frentista arrecadou por forma de pagamento vs. o que os bicos
(encerrantes) indicam, apurando `diferenca` (sobra/falta) e `valor_conferido`.

⚠️ Não confundir com o **ProvControl** (Laravel, pausado, vive em
`../ProvControl`) — projetos e codebases diferentes, mesmo domínio de
negócio.

## O problema real que esta skill existe para resolver

`valor_conferido`/`diferenca` estava **duplicado em ~6 implementações**
espalhadas entre `apps/pwa-frentista`, hooks de `apps/web`, services e um
aggregator. Dead code já confirmado e removido
(`packages/utils/src/calculators.ts`, `dates.ts`); `type-check` passou.

**A consolidação em `packages/utils/src/fechamento.ts` FOI CONCLUÍDA** —
verificado em 2026-07-29: 11 arquivos de `apps/web` e `apps/pwa-frentista`
importam o módulo canônico.

Restam **dois** pontos que ainda somam buckets na mão, ambos calculando
`soma_manual − valor_conferido` e rotulando `'OK'`/`'Divergente'`:

1. `apps/web/src/services/api/aggregator.service.ts:658,703,704` — 6 buckets,
   **omite moedas**. O MESMO arquivo usa o canônico corretamente na linha 400
   (`conferido(meiosFromFechamentoRow(fechamento))`). Inconsistência interna
   de um arquivo só.
2. `apps/web/src/components/frentistas/hooks/useHistoricoFrentista.ts:42-43` —
   4 buckets, **omite moedas, débito e crédito**.

Efeito: sessão com `valor_moedas > 0` aparece como `'Divergente'` estando
correta. Esta skill define como consolidar esses dois **sem quebrar o que já
funciona pro dono do posto**.

**Regra inegociável: nunca consolide antes de ter teste. Nunca escreva o
teste depois de consolidar.** Ordem obrigatória:

1. Escreva teste golden master contra `docs/data/janeiro_referencia.sqlite`
   rodando **cada uma das implementações existentes** (o máximo que der pra
   isolar sem reescrever nada ainda) contra os mesmos dias de janeiro.
2. Onde todas baterem com a referência → esse é o comportamento correto,
   confirmado por dado real.
3. Onde divergirem entre si → **pare e confirme com o usuário** qual está
   certa antes de escolher — pode ser bug em uma delas, não assuma.
4. Só então extraia para `packages/utils` uma implementação única (nome
   sugerido: `packages/utils/src/fechamento.ts`, evitando colidir com o
   `calculators.ts` já removido), e troque os 6 call sites **um de cada
   vez**, rodando o mesmo teste golden master a cada substituição — nunca em
   lote.

## Arquitetura de cálculo

O cálculo do fechamento roda **no front-end**, não no backend/Edge Function.
A lógica deve ser **pura e sem I/O** para ser testável isoladamente:

```
packages/utils/src/fechamento.ts   ← funções puras: litros(), valorConferido(),
                                       diferenca(), etc. Sem fetch, sem cliente
                                       Supabase, sem side effect.
packages/utils/src/fechamento.test.ts  ← bun:test cobrindo fechamento.ts isolado
```

Componentes de `apps/web` e `apps/pwa-frentista` **chamam** essas funções —
nunca reimplementam a fórmula localmente. Se isso já está acontecendo (é o
caso hoje, daí as 6 cópias), é exatamente o que a consolidação do passo 4
acima resolve.

## Golden master com bun:sqlite

`docs/data/janeiro_referencia.sqlite` é a fonte de verdade validada com dado
real de janeiro. Use `bun:sqlite` (nativo, sem dependência nova) pra ler os
valores esperados dentro do teste:

```ts
import { Database } from "bun:sqlite";
import { test, expect } from "bun:test";
import { diferenca, valorConferido } from "./fechamento";

const db = new Database("docs/data/janeiro_referencia.sqlite", { readonly: true });

// ajuste a query ao schema real do sqlite de referência
const dias = db.query("SELECT * FROM fechamentos_janeiro").all();

for (const dia of dias) {
  test(`diferenca bate com referência — dia ${dia.data}`, () => {
    expect(diferenca(dia.total_concentrador, dia.total_conferido))
      .toBe(dia.diferenca_esperada);
  });
}
```

Se o schema do sqlite de referência for diferente do que a query acima
assume, **confira a estrutura real do arquivo antes de escrever o teste** —
não adivinhe nomes de coluna.

## Fórmula canônica do fechamento

- O **total informado** pelos frentistas é declaratório e fica **separado**
  do **valor conferido** (o que realmente entrou no caixa).
- **Recebimentos eletrônicos já compõem o valor conferido — não some de
  novo.**
- `diferenca = total_concentrador − total_conferido` (nessa ordem — **FALTA é
  positivo, SOBRA é negativo**). Confirmado empiricamente com dado real de
  janeiro (dias 1–3): quando o conferido é maior que o concentrador, sobrou
  dinheiro no caixa (diferença negativa); quando o conferido é menor, faltou
  (diferença positiva). `isFalta = diferenca > 0` é a implementação correta.
- Por bico: `litros = encerrante_final − encerrante_inicial`;
  `valor = litros × preço_litro`. O encerrante inicial de um dia é o final do
  dia anterior no mesmo bico.
- **Bico** = ponto de abastecimento; **concentrador** = leitura eletrônica
  das bombas (venda "oficial"); **frentista** = funcionário; **encerrante** =
  leitura acumulada do bico.
- **Composição do valor conferido — confirmado empiricamente** contra
  `janeiro_referencia.sqlite` (136 de 142 linhas batem exato, tolerância meio
  centavo): `conferido = pix + credito + debito + moeda + notas + baratao +
  dinheiro`. Inclui moedas, baratão e nota a prazo — não é só
  dinheiro+cartão+pix.
- **Exceção conhecida — dia 31 de cada mês**: 6 linhas onde o total é ≈1,8×
  a soma esperada. Parecem ser linhas de fechamento mensal (consolidação),
  não fechamento diário. **Ficam de fora do golden master por enquanto** —
  não modele essas linhas como bug do dia normal; investigue separadamente
  antes de incluir no teste.

Se qualquer um desses nomes ou fórmulas aparecer diferente no código atual,
**o dado real de janeiro decide, não a intuição** — investigue a divergência
antes de "corrigir" qualquer lado.

## Números: cuidado com float

Dinheiro e litros não devem ser somados/subtraídos como `number` fracionário
puro em JS — arredondamento de ponto flutuante é a causa mais comum de
`diferenca` "quase certa, mas não bate". **Testado contra os 142 dias de
janeiro: float não causou erro prático nessa escala (136/136 exatos com
tolerância de meio centavo)** — mas escale para inteiro (centavos,
mililitros) mesmo assim antes de operar, e só desescale na exibição. Não é
sobre o bug de hoje, é sobre o bug que vai aparecer quando o volume ou a
precisão mudarem.

## Spike de OCR "encerrante" (branch `ocr`) — contexto relacionado

Edge Function `ler-encerrante` usa Gemini Vision como proxy stateless pra ler
o papel de encerrante impresso: é um relatório com os 6 bicos de uma vez, em
ordem fixa 1→6 — **uma foto = 6 leituras posicionais**, não leitura de
display individual. Backend deployado; falta UI no PWA e foto real de
amostra pra ajustar o prompt. Isso alimenta os mesmos `encerrante_inicial`/
`encerrante_final` usados na fórmula de litros acima — ao integrar, valide o
valor lido contra a mesma fórmula e, se possível, contra o mesmo golden
master.

## Checklist antes de fechar qualquer tarefa nesta área

- [ ] Conferi a fórmula contra `janeiro_referencia.sqlite` (ou esta skill),
      não assumi por intuição
- [ ] A lógica está em `packages/utils`, pura, sem I/O — não duplicada em
      PWA/web/service/aggregator
- [ ] Escrevi teste `bun:test` golden master comparando com janeiro (quando
      aplicável)
- [ ] Se estou consolidando um dos 2 pontos restantes (aggregator ou
      useHistoricoFrentista): rodei o teste ANTES e DEPOIS da troca de cada
      call site, nunca troquei em lote
- [ ] Testes usam valores escalados/inteiros onde há dinheiro ou litro, não
      `number` fracionário cru
- [ ] Textos e nomes de domínio em PT-BR, consistentes com o vocabulário
      acima
