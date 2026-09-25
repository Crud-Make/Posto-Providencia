# Fechamento do frentista pela API — Design Doc

Issue: #101 (mãe: #60) · Estado: **fatia 1 entregue (login por PIN, envio do turno, presença) — 25/09/2026** · Criado: 17/09/2026

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

## 3. O unique por frentista e dia — e a idempotência

> **Atualização 25/09/2026 (fatia 1):** o índice `fechamento_frentista_unico_por_dia
> (fechamento_id, frentista_id)` **já está** no esquema de produção extraído do catálogo
> (`banco/init/01-esquema-base.sql:761`) — o painel (P11) faz UPSERT sobre ele. O texto abaixo é o
> de 17/09, mantido como histórico. A idempotência da fatia 1 está em §8.2.

`(fechamento_id, frentista_id)` está **escrito desde 19/08 e nunca aplicado**. Vira migration do
Laravel nesta issue — e o §5 do CLAUDE.md pede idempotência justamente aqui ("o mesmo envio do
frentista chegando duas vezes").

**Antes de aplicar, procurar duplicata no dado existente.** Uma migration de unique morre no meio se
já houver par repetido, e o banco de produção tem 1.197 linhas de `FechamentoFrentista`. A ordem é:
consultar duplicatas → decidir com o dono o que fazer com cada uma → só então criar o índice.

`POST /api/fechamentos` (o pai) é idempotente por `(posto, data, turno)`.

## 4. DECISÃO 2 — identidade: **PIN por frentista** (decidido pelo dono em 19/09/2026)

> **Decisão do dono, 19/09/2026: PIN por frentista, pedido a cada turno** — e não o token de
> aparelho que este Design Doc recomendava. O motivo dele: impedir que o frentista A lance como o
> frentista B, que o token de aparelho não impede (o aparelho é um só para todos). Implementado na
> fatia 1 (§8). O texto abaixo é o de 17/09, mantido como registro da recomendação vencida.

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

## 6. Contratos (proposta de 17/09 — os da fatia 1, como entregues, estão em §8.1)

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

## 8. Fatia 1 — entregue em 25/09/2026

Login do frentista por PIN, envio do fechamento do turno e sinal de presença pela API, com o PWA
atrás de flag (`VITE_API_URL` + `VITE_API_PWA=1`). Sem a flag, o PWA grava no Supabase como sempre.

### 8.1 Rotas e contratos

| Rota | Guard | Corpo | Respostas |
|---|---|---|---|
| `POST /api/postos/{posto}/frentistas/entrar` | `DefinePostoAtual`, `throttle:pin-frentista` | `{ frentista_id: int, pin: "4 a 6 dígitos" }` | 200 `{ token, vence_em (ISO Z), frentista: { id, nome } }` · 401 `{ message: "Frentista ou PIN incorretos." }` (PIN errado, inativo, sem PIN, de outro posto — **a mesma resposta**) · 422 forma · 429 |
| `POST /api/postos/{posto}/envios` | `DefinePostoAtual`, `frentista.do.posto` | `{ data: "AAAA-MM-DD", chave: uuid, encerrante, valor_pix, valor_dinheiro, valor_moedas, baratao, valor_nota, valor_cartao_debito, valor_cartao_credito, valor_cartao, valor_conferido, diferenca_calculada (string decimal "0.00"), observacoes }` | 201 `{ data: { id, fechamento_id, frentista_id, data_hora_envio, repetido: false, consolidacao: { apurado, total_vendas, total_recebido, diferenca } } }` · 200 o mesmo com `repetido: true`, `consolidacao: null` · 409 `ja_enviado` / `chave_reutilizada` · 422 `fora_da_janela` / `corpo_invalido` · 401/403 |
| `POST /api/postos/{posto}/presenca` | `DefinePostoAtual`, `frentista.do.posto` | — | 204 |

- **O frentista vem do TOKEN, nunca do corpo.** `frentista_id` no corpo do envio é ignorado; o
  `fechamento_id` e o `posto_id` também não são aceitos do cliente.
- **Token:** Sanctum pessoal, dono `App\Pessoas\Domain\AcessoFrentista`, ability `frentista`,
  vence em **14 h** (um turno com folga; o PIN é pedido a cada turno). O guard `frentista.do.posto`
  exige dono `AcessoFrentista` (o token do gerente tem ability `*`, então a classe do dono é o que
  separa), token não vencido e frentista **ativo** e **do posto da rota** (401 / 403). O guard do
  painel (`token.atual`) recusa token cujo dono não é `Usuario` — o do frentista não abre rota de
  gerente.
- **PIN:** tabela `AcessoFrentista` (`banco/init/04-acesso-do-frentista.sql`), só hash bcrypt (cast
  `hashed`), RLS ligada sem policy e sem GRANT para `anon`/`authenticated` — um PIN de 4 a 6 dígitos é
  quebrável offline, então o hash não pode ficar ao alcance da chave pública do Supabase. Definido
  **só por comando** (`php artisan frentista:pin {frentista_id}`, pede duas vezes, sem eco); trocar o
  PIN derruba as sessões abertas do frentista. Rota de gestão do PIN pelo painel ficou fora (mínimo).
- **Limite:** 10 tentativas/min por IP e 5/min por frentista (`LimitesDeTaxaServiceProvider`).

### 8.2 Idempotência e unicidade

- O PWA gera uma `chave` (UUID) por tentativa e a **reusa** enquanto os valores, a data e o frentista
  não mudam (`features/envio-pela-api`). Gravada em `FechamentoFrentista.chave_envio` (unique; NULL nas
  linhas antigas e nas do painel).
- Mesma chave + mesmo frentista, posto, dia e conteúdo → **200 `repetido`**, sem gravar de novo (é a
  rede que caiu depois do commit). Mesma chave com qualquer diferença → **409 `chave_reutilizada`**.
- Chave nova, mesmo frentista no mesmo dia → **409 `ja_enviado`** — a regra que a tela do PWA já
  aplica ("Para corrigir, fale com o gerente no painel"). Reenvio que **substitui** não foi decidido
  (§9, pergunta 1).
- O pai do dia é travado com `FOR UPDATE` e criado com `INSERT … ON CONFLICT DO NOTHING`: dois
  frentistas enviando ao mesmo tempo não viram 500 nem se atropelam na consolidação; o gêmeo que
  perde a corrida cai na checagem de dentro da trava.

### 8.3 O pai e a consolidação — porte fiel, sem fórmula nova

- O pai é o de `buscarOuCriarFechamento`: `data` = 00:00Z do dia, `turno_id` = 1 (turno canônico),
  nasce `ABERTO` com `total_vendas`/`diferenca` NULL, `total_recebido` 0 e `usuario_id` 1 (o padrão que
  o PWA grava hoje — o frentista não é `Usuario`).
- Depois do filho, o servidor reconsolida com `App\Fechamento\Domain\ConsolidacaoDoDia`, porte do
  `consolidarFechamento` de `packages/api-core/src/encerrante.ts`: `total_recebido` = soma dos 7 baldes
  de todos os filhos; `total_vendas` = soma de `Leitura.valor_total` do dia; `diferenca` =
  vendas − recebido; **sem leitura, ou com menos leituras que bicos ativos, venda e diferença ficam
  NULL**. Soma exata em bcmath (todas as colunas são `numeric(15,2)`), o mesmo número que o
  `emCentavos` a cada passo produz. Caracterizado em `tests/Unit/Fechamento/ConsolidacaoDoDiaTest.php`
  com os valores **tirados da função TypeScript** (`totaisDoDia`), incluindo `0.10 + 0.20` e sobra.
- O servidor **não** refaz a conta da sessão (`valor_conferido`, `diferenca_calculada`): grava como veio
  (DECISÃO 1). Janela de escrita: a mesma do painel (`JanelaDeEscrita`, cópia literal de
  `dentro_da_janela_de_escrita`: de 31/12/2025 até amanhã — §5).

### 8.4 Limites conhecidos da fatia 1

- **Unique `(data, turno_id)` sem `posto_id`** (`01-esquema-base.sql:757`): num banco compartilhado, o
  segundo posto a abrir o mesmo dia no turno 1 recebe 500 e nada é gravado (teste
  "trava conhecida até a #93"). A migration multi-tenant da #93 resolve.
- **O aviso ao dono (`notifica-dono`) não dispara** no caminho da API: a Edge Function lê a linha pelo
  `id` no Supabase, e com a API num banco diferente ela leria a linha errada. Volta quando a
  notificação for do servidor.
- **As leituras do PWA continuam no Supabase** (frentistas, envios do dia, histórico): com a API num
  banco diferente, a lista "já enviou" da tela olha o lugar errado — o servidor ainda barra (409), mas
  a mensagem só chega depois do toque. Por isso a flag não segue o `VITE_API_URL` global.

### 8.5 Fatia 2 (não feita)

- Venda de produto (`VendaProduto`, `registrarVendaProduto`) e medição de tanque
  (`HistoricoTanque`, `salvarMedicaoTanque`) pela API, com o mesmo guard.
- Leituras do PWA pela API: frentistas ativos, envios do dia, histórico do frentista, produtos,
  tanques, vendas de hoje.
- Troca da foto do frentista pela API (hoje é UPDATE anônimo no Supabase).
- Aviso ao dono disparado pelo servidor.

## 9. Perguntas abertas para o dono (fatia 1)

1. **Reenvio com valor diferente.** Hoje o frentista que já enviou o dia recebe 409 e "fale com o
   gerente no painel". Deve continuar assim, ou o frentista pode corrigir o próprio envio (substituir),
   e até quando?
2. **Quem define o PIN.** Hoje só por comando no servidor. Precisa de tela no painel para o gerente
   definir/trocar o PIN de cada frentista?
3. **Duração da sessão.** 14 h por login. Serve para os turnos do posto, ou o PIN deve ser pedido a
   cada envio?
