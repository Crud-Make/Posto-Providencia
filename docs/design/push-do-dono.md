# Push do dono — Design Doc

Issue: #99 (mãe: #60) · Estado: **rascunho — única pendência do dono é instalar `minishlink/web-push`** · Data: 17/09/2026

> Porta `supabase/functions/notifica-dono` (157 linhas) para job em fila. É a **primeira e única**
> entrada do Redis no sistema, e o **primeiro Command de verdade** da Fase A — ao contrário da #98,
> aqui o §5 do CLAUDE.md se aplica inteiro.
> Fonte: `supabase/functions/notifica-dono/index.ts`.

## 1. Contexto — o que muda para quem está fora

O dono continua recebendo "Fulano fechou o caixa · 03/09". O frentista para de esperar: hoje o
`functions.invoke` é síncrono dentro do envio; com fila, o PWA responde assim que enfileira.

Ganho de segurança que vale registrar: `notifica-dono` é **o único lugar do sistema que usa
`service_role`**. Portar apaga essa chave do mapa.

## 2. Subsistema

`App\Notificacao` — `InscricaoPush` (Domain), `NotificarDonoDoEnvio` (Job/Command),
`EnviadorWebPush` (Compartilhado). Fila Redis; `failed_jobs` como DLQ.

### DECISÃO 1 — aqui é Command, com fila. Sem discussão.

Muda estado (`usada_em`, desativação de inscrição morta), tem efeito externo irreversível (a
notificação chega no celular) e ninguém precisa esperar o resultado. É exatamente o caso do §5.

## 3. Componentes

| Componente | Responsabilidade |
|---|---|
| `POST /api/push/inscricoes` | o `pwa-dono` grava a inscrição pela API (hoje escreve direto no banco, `lib/push.ts:154`) |
| `POST /api/fechamentos-frentista/{id}/avisar-dono` | enfileira e devolve `202` |
| `NotificarDonoDoEnvio` (Job) | busca inscrições ativas do papel `dono`, monta o aviso, envia |
| `EnviadorWebPush` | VAPID + `minishlink/web-push` — **instalar exige seu ok** |
| `MontaAvisoDeFechamento` | título e corpo, incluindo a data — ver a armadilha abaixo |

## 4. Comportamento

### ⚠️ A armadilha da data — é aqui que o porte quebra

`formatarDia` não é código feio, é **cicatriz**. O comentário no original é explícito:

> `Fechamento.data` é `timestamptz`, não `date`: o PostgREST devolve o ISO completo. A versão
> anterior colava `'T00:00:00'` nele e o `new Date()` virava `Invalid Date` — foi o que o dono viu no
> celular em **02/09/2026**.

A solução de hoje recorta o `AAAA-MM-DD` com regex e **nunca constrói um objeto de data**, porque
converter para o fuso do runtime escorrega o dia para trás.

**Em PHP a armadilha é pior, não melhor.** O Carbon aceita o `timestamptz` de bom grado e converte
para o timezone da aplicação — que a #96 configurou como pt-BR. O resultado não é `Invalid Date`
berrando: é um **dia errado, silencioso**, exatamente o modo de falha que
`timestamps-leitura-em-utc` já documentou neste repo.

**Regra desta issue:** `MontaAvisoDeFechamento` recorta a string, igual ao Deno. Nada de
`Carbon::parse($data)->format('d/m')`. Teste obrigatório: fechamento gravado às `00:00:00+00` com a
app em `America/Sao_Paulo` tem de render o **mesmo dia**, não o anterior.

### ⚠️ Bug encontrado no original — o carimbo pega inscrição que não recebeu

```ts
if (enviados) {
  await supabase.from('InscricaoPush').update({ usada_em: … })
    .eq('papel', 'dono').eq('ativa', true);   // ← TODAS, não as que receberam
}
```

Com dois aparelhos, se só um recebe, **os dois são carimbados**. `usada_em` passa a mentir sobre qual
aparelho está vivo. No porte, carimbar **por inscrição que respondeu `ok`**. Não portar o bug.

### DECISÃO 3 — idempotência por `(fechamento, inscrição)` (decidido)

A issue pede idempotência por `fechamento_frentista_id`. Isso resolve o envio duplicado do PWA (o
§5 nomeia esse caso, e o unique de `FechamentoFrentista` segue **escrito e não aplicado**) — mas
**não** resolve a retentativa da fila.

O job envia para N inscrições num laço. Se a 1ª foi e a 2ª falhou, o `retry` reenvia para a 1ª: o
dono recebe a mesma notificação duas vezes.

Decisão: chave de idempotência **`(fechamento_frentista_id, inscricao_id)`**, gravada quando o push
é aceito. O laço pula o que já foi. Custo: uma tabela pequena ou uma coluna de marcação. Com o dono
tendo 1 ou 2 aparelhos, é barato — e é a diferença entre "chegou" e "chegou três vezes". É
engenharia de entrega, não regra de negócio: a planilha não tem opinião sobre isso.

### Erros: dois tipos, tratamento diferente

- **404 / 410** → inscrição morta (app desinstalado, permissão revogada, endpoint trocado).
  `ativa = false`, **sem retentativa**. Insistir é erro em toda notificação futura, para sempre.
- **Qualquer outro** → falha transitória, retentativa da fila, e depois `failed_jobs`.

Colapsar os dois num `try/catch` genérico — o caminho fácil no porte — faz o job morrer eternamente
tentando um endpoint que nunca mais vai existir.

## 5. Contratos

`POST /api/push/inscricoes`
```json
{ "endpoint": "https://fcm.googleapis.com/…", "p256dh": "…", "auth": "…", "papel": "dono" }
```

`POST /api/fechamentos-frentista/{id}/avisar-dono` → `202 Accepted`
```json
{ "enfileirado": true, "fechamento_frentista_id": 123 }
```

Payload do push (inalterado, o service worker do `pwa-dono` já o espera nesta forma):
```json
{ "titulo": "João fechou o caixa", "corpo": "03/09 · toque para ver os envios",
  "fechamentoFrentistaId": 123 }
```

## Testes

- **Data, o teste que justifica a issue**: `timestamptz` `00:00:00+00` com app em `America/Sao_Paulo`
  → dia correto. E `data = null` → `"hoje"`.
- **Idempotência**: mesmo `fechamento_frentista_id` duas vezes → um push por aparelho.
- **Retentativa parcial**: 2 inscrições, a 2ª falha, job repete → a 1ª **não** recebe de novo.
- **404/410** → `ativa = false` e **zero** retentativas; 500 → vai para `failed_jobs`.
- **Carimbo**: só a inscrição que respondeu `ok` recebe `usada_em`.
- Tudo com `Http::fake()` e `Queue::fake()`. Nenhum push real no CI.

## Riscos e decisões em aberto

- 📦 **`minishlink/web-push` precisa do seu ok** para entrar no `composer.json` (a issue já marca isso).
  É a biblioteca de referência em PHP para VAPID; a alternativa é assinar na mão, que eu não recomendo.
- 🔑 **Chaves VAPID** são as mesmas de hoje — trocá-las **invalida todas as inscrições existentes** e o
  dono para de receber até reinstalar o PWA. Copiar, nunca regerar.
- 🧰 **Redis entra aqui e só aqui.** A #96 deixou fila em `sync`; esta issue é quem liga o Redis no
  compose. Até ela, nenhum outro módulo deve assumir fila disponível.
- **Alerta de `failed_jobs`**: a issue pede DLQ "com alerta". Notificar falha de notificação por
  notificação é circular — sugiro log + uma checagem no `GET /api/saude`, que já existe desde a #96.
- O `pwa-frentista` (`services/api.ts`) e o `pwa-dono` (`lib/push.ts`) são os dois consumidores a
  trocar. Os dois já passam por `packages/api-core`, então a mudança fica contida.
