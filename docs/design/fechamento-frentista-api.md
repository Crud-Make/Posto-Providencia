# Fechamento do frentista pela API — Design Doc

Issue: #101 (mãe: #60) · Estado: **rascunho — pendência do dono: identidade do aparelho (§4)** · Data: 17/09/2026

> A issue que mexe no caminho de dinheiro em produção. 15 chamadas em 8 tabelas, todas em
> `frontend/apps/pwa-frentista/src/services/api.ts`.
> Regra de domínio: skill `fechamento-posto-providencia`. Fórmulas da fonte: `docs/planilha-formulas.md`.

## 1. Contexto

O frentista fecha o turno no PWA. Hoje: `getOrCreateFechamento` → `INSERT FechamentoFrentista` →
`consolidarFechamento` (em `packages/api-core`, **rodando no cliente**) → `UPDATE Fechamento` →
`notifica-dono`.

## 2. DECISÃO 1 — `totaisDoDia` continua no cliente TS (opção A)

A issue oferece A (cliente, API só persiste) ou B (servidor PHP). **É A**, e não é preferência:

- Os **3.296 golden masters vivem em TypeScript**. Portar a fórmula para PHP sem portar o golden
  antes cria a **quarta** implementação do cálculo de dinheiro — o modo de falha que a skill nomeia
  explicitamente.
- A própria issue diz que B exige o golden portado para Pest **antes**, e que "A e B não podem ser
  feitas juntas". B é Fase B.
- Fase A é **migrar o transporte**, não mover fórmula.

**O custo de A, dito em voz alta:** o servidor passa a confiar num número calculado no cliente.
Mitigação **sem** reimplementar a fórmula: o endpoint grava as **entradas** junto com o resultado
(os 7 baldes de `conferido`, o total do concentrador e o `diferenca_calculada`). Assim uma auditoria
futura recalcula e confere. O que **não** vamos fazer é uma "validação" no servidor que refaça a
conta — isso seria a quarta implementação entrando pela porta dos fundos.

## 3. ⚠️ O unique que nunca foi aplicado

`(fechamento_id, frentista_id)` está **escrito desde 19/08 e nunca aplicado**. Vira migration do
Laravel nesta issue — e o §5 do CLAUDE.md pede idempotência justamente aqui ("o mesmo envio do
frentista chegando duas vezes").

**Antes de aplicar, procurar duplicata no dado existente.** Uma migration de unique morre no meio se
já houver par repetido, e o banco de produção tem 1.197 linhas de `FechamentoFrentista`. A ordem é:
consultar duplicatas → decidir com o dono o que fazer com cada uma → só então criar o índice.

`POST /api/fechamentos` (o pai) é idempotente por `(posto, data, turno)`.

## 4. DECISÃO 2 — identidade do aparelho ⚠️ **precisa do dono**

Hoje o PWA roda como `anon` e o frentista "se identifica" escolhendo o nome numa lista, guardado em
`localStorage` (`pwa.frentista`). Não há autenticação nenhuma. Quando a #102 fechar a API, o PWA
precisa de identidade.

| Opção | Efeito no frentista |
|---|---|
| **Token de aparelho** (recomendado) | nenhum. Pareia uma vez na instalação, continua escolhendo o nome na lista |
| PIN por frentista | passa a digitar PIN a cada turno |

Recomendo o token: o aparelho é do posto, fica no posto, e o frentista está de mãos ocupadas. O PIN
protege contra "frentista A lançar como frentista B", que é um risco real — **mas isso é decisão sua
sobre a rotina deles, não minha.**

Enquanto a #102 não fechar, as rotas do PWA seguem públicas, como já estão hoje.

## 5. A janela de escrita muda de lugar — e é maior do que parece

Hoje é policy SQL (`dentro_da_janela_de_escrita`); vira regra de aplicação. **Atenção ao portar:** a
janela real cobre cerca de **1,5 mês**, não 7 dias — está registrado em
`reset-do-painel-apaga-em-silencio`. Portar "o que a gente acha que é" em vez do que a policy faz
mudaria silenciosamente o que o frentista consegue corrigir.

Se 1,5 mês estiver errado, **encurtar é decisão sua, em issue separada** — não um efeito colateral
desta.

## 6. Contratos

```
POST   /api/postos/{posto}/fechamentos                 { data, turno_id }  → idempotente
POST   /api/fechamentos/{id}/frentistas                { frentista_id, meios:{...}, concentrador }
PUT    /api/fechamentos/{id}/frentistas/{ff}           (dentro da janela)
DELETE /api/fechamentos/{id}/frentistas/{ff}           (dentro da janela)
GET    /api/postos/{posto}/frentistas                  (já entregue na #97)
POST   /api/fechamentos/{id}/historico-tanque
POST   /api/fechamentos/{id}/vendas-produto
POST   /api/postos/{posto}/presencas
```

Dinheiro em **string decimal**, nunca float — regra da #97. `diferenca_calculada` é gravado pelo
cliente e **não recalculado** pelo servidor (DECISÃO 1).

`frontend/packages/api-core` passa a receber um client HTTP no lugar do `SupabaseClient`. Os dois
PWAs já entram por ele (5 call sites), então a troca fica contida — ao contrário do painel, que tem
1 service de 38 passando por lá.

## Testes

- `bun run test` **e** `bun run test:golden` verdes antes e depois — nunca `bun test` puro.
- Idempotência do pai: mesmo `(posto, data, turno)` duas vezes → um `Fechamento`.
- Unique: mesmo `(fechamento, frentista)` duas vezes → 409, não duplicata.
- Janela: escrita dentro passa, fora recusa — com a janela **medida**, não suposta.
- Validação de ponta a ponta pela skill `validar-feature-posto-providencia`: frentista fecha em
  `localhost:3016`, painel mostra, `diferenca` bate.

## Riscos

- ⚠️ **`consolidarFechamento` roda no cliente e é o que grava o pai.** O mecanismo de
  `doze-dias-nunca-fechados` segue no código: o PWA cria o pai zerado e só o painel consolida. Esta
  issue **não** conserta isso — mas não pode piorar. Teste explícito de que o pai não fica zerado.
- ⚠️ `Frentista.foto` passa pela API: a #97 deixou `foto` **oculta** no Resource. Expor de volta é
  mudança consciente, com rota própria, não um `$hidden` removido no susto.
- O PWA é o único app que escreve dinheiro sem nenhuma autenticação hoje. Esta issue é a última
  chance de corrigir isso antes do cutover.
