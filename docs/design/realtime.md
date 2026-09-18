# Realtime do painel — Design Doc

Issue: #104 (mãe: #60) · Estado: **rascunho — sem pendência com o dono** · Data: 17/09/2026

## 1. Contexto

Quatro canais `postgres_changes` no painel — `Fechamento`, `FechamentoFrentista`, `Leitura`,
`Frentista` — em `fechamento-diario/index.tsx:99-145`, `useCarregamentoDados.ts:189` e
`useFrentistas.ts:60`. **Todos os quatro só fazem refetch.** Nenhum aplica o payload do evento.

Esse detalhe decide a issue inteira: se ninguém usa o conteúdo do evento, o que se precisa é de um
**sinal de "mudou"**, não de um canal de mensagens.

## 2. DECISÃO 1 — polling com carimbo de versão, não Reverb

| | Polling | Laravel Reverb |
|---|---|---|
| Infra nova | nenhuma | servidor WebSocket, porta, TLS, supervisão de processo na VPS |
| Resultado para 12 frentistas | idêntico | idêntico |
| Falha silenciosa | refetch atrasa alguns segundos | conexão cai e a tela congela sem avisar |

Reverb é a resposta certa para muitos clientes e eventos ricos. Aqui são **4 canais que só fazem
refetch** e um punhado de usuários. Subir websocket numa VPS que o dono paga, para substituir algo
que só dispara `refetch()`, é infra que não se paga.

### Polling ingênuo seria pior que o Supabase — então não é ingênuo

Três telas recarregando tudo a cada poucos segundos martelaria a API. O desenho:

```
GET /api/postos/{posto}/mudancas?desde=<iso>
  → { fechamento: "2026-09-17T14:02:11Z", fechamento_frentista: "...", leitura: "...", frentista: "..." }
```

Uma consulta barata que devolve só o `MAX(updated_at)` das 4 tabelas. O cliente compara com o que
tem e **só refaz o fetch pesado da tabela que mudou**. É o mesmo comportamento do canal de hoje —
"algo mudou, recarregue" — sem carregar payload.

Regras de implementação:

- **Intervalo 10 s** com a aba visível. Ajustável por env, não por código.
- **`document.visibilityState`**: aba oculta não faz poll. O painel fica aberto o dia inteiro na
  tela do posto; sem isso, é bateria e requisição queimadas à toa.
- **Cleanup no desmonte continua obrigatório** (a issue já exige). Com polling isso é
  `clearInterval` no retorno do `useEffect`. Atenção ao StrictMode do React 18, que monta duas vezes
  em desenvolvimento: cleanup errado vira **dois** intervalos e o bug só aparece como "a API está
  lenta".
- Um único hook `useMudancas(posto)` compartilhado pelas 3 telas, não três timers independentes.

## 3. Contrato

`GET /api/postos/{posto}/mudancas` → `200`

```json
{
  "fechamento":            "2026-09-17T14:02:11Z",
  "fechamento_frentista":  "2026-09-17T14:02:11Z",
  "leitura":               "2026-09-17T13:40:00Z",
  "frentista":             "2026-09-01T09:12:00Z"
}
```

`null` quando a tabela não tem linha no posto. Sem corpo de requisição, sem paginação, sem efeito
colateral — é `GET` puro e cacheável por 1 s se um dia precisar.

## Testes

- O endpoint devolve `MAX(updated_at)` por tabela, escopado ao posto (reusa `PertenceAoPosto` da #97).
- Hook: muda o carimbo → refetch **só** da tabela que mudou; carimbo igual → **nenhum** fetch.
- Desmonte limpa o intervalo; montar duas vezes (StrictMode) não deixa timer órfão.
- Aba oculta não dispara requisição.
- Aceite da issue: envio no PWA aparece no painel aberto sem F5.

## Riscos

- ⚠️ **Nem toda tabela tem `updated_at`.** A #97 registrou que os timestamps são irregulares
  (`Usuario` usa `createdAt`/`updatedAt`; `Tanque` e `UsuarioPosto` só `created_at`). Conferir as 4
  tabelas deste endpoint **antes** de escrever a query; onde faltar, a migration entra aqui.
- Latência passa de ~instantânea para até 10 s. Para "o dono vê que o frentista fechou", é
  irrelevante. Se algum dia virar incômodo, o contrato acima não impede trocar por Reverb depois —
  o cliente continua perguntando "mudou?".
- Esta issue **depende da #103**: enquanto o painel falar direto com o Postgres, o canal do Supabase
  ainda é a fonte do sinal. Migrar realtime antes seria manter os dois.
