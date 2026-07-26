# Plano — Leitura de encerrante por foto (Gemini Vision) no PWA

> Feature: o frentista fotografa o visor da bomba no PWA → Gemini lê o número → preenche a
> leitura, que flui para a aba "Leituras de Bomba" da web. Branch: `testes-funcionais`.
> Cada fase é auto-contida e executável em contexto novo (via `/do`).

## Contexto & objetivo
- Monorepo Bun/Vite: `apps/web` (dono) + `apps/pwa-frentista` (frentista). Backend = Supabase (Postgres + RLS), **sem** serverless hoje.
- Hoje o PWA só envia `FechamentoFrentista.encerrante` (um valor em R$). As leituras de bomba por bico
  (odômetro) são digitadas na web. Esta feature adiciona captura por foto no PWA → tabela `Leitura`.
- Objetivo de aceitação: numa amostra de fotos reais dos visores, o número lido bate com o digitado à
  mão em ≥95% dos casos; quando erra, é editável antes de salvar (nunca gravar cego).

## Dependências externas (resolver ANTES da Fase 1)
- [ ] **Gemini API key** (Google AI Studio, free tier) — o usuário fornece.
- [ ] **Supabase CLI** logado no projeto (para `functions deploy` e `secrets set`).
- [ ] Confirmar no **dashboard Supabase** as policies vigentes de `Leitura` (migrations dizem
      `authenticated`, mas o PWA grava `FechamentoFrentista` como anon — RLS de produção pode divergir do repo).

---

## Fase 0 — Descoberta (CONCLUÍDA) · APIs permitidas e fatos

### Gemini (fontes: ai.google.dev/gemini-api/docs/image-understanding, /api/generate-content)
- **Modelo:** `gemini-flash-lite-latest` (alias p/ o flash-lite atual; multimodal, mais barato). Fallback mais
  forte: `gemini-3.5-flash`. VALIDADO nesta conta em 2026 — o `gemini-2.5-flash-lite`/`2.0-flash-lite`
  retornam 404 "no longer available to new users" / 429. Não fixar versão 2.x.
- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`
- **Auth:** header `x-goog-api-key: <KEY>` (ou `?key=`).
- **Body (REST, snake_case):** `contents[0].parts = [{ inline_data: { mime_type, data } }, { text }]`.
  `data` = base64 **puro** (sem `data:image/...;base64,` — no browser: `dataUrl.split(",")[1]`).
  `generationConfig: { temperature: 0, responseMimeType: "application/json" }`.
- **Resposta:** texto em `candidates[0].content.parts[0].text` (será JSON por causa do responseMimeType).
- **Limites:** requisição inline total ≤ 20 MB; MIME png/jpeg/webp/heic/heif. RPM/RPD do free variam —
  conferir em aistudio.google.com/rate-limit.
- **Prompt** (forçar só-número; ver texto pronto na Fase 1).

### Código (fonte-verdade: `apps/web/src/types/database`, NÃO `packages/types` que está dessincronizado)
- **Tabela `Leitura`** — `apps/web/src/types/database/tables/operacoes.ts:52-135`. Colunas de escrita:
  `bico_id, combustivel_id, data (YYYY-MM-DD), turno_id (nullable), leitura_inicial, leitura_final,
  preco_litro, usuario_id, posto_id (NOT NULL)`. Calculados no service: `litros_vendidos = final-inicial`,
  `valor_total = litros * preco_litro`.
- **Escrita:** `leituraService.create` (`apps/web/src/services/api/leitura.service.ts:207-221`) — insert puro,
  calcula litros/valor, e baixa estoque (`:226-239`). `bulkCreate` (`:282`) é o caminho das telas web.
- **Bicos/preços:** `bicoService.getWithDetails(postoId)` (`apps/web/src/services/api/bico.service.ts:43-59`)
  — `Bico` ativo + `bomba` + `combustivel.preco_venda`. As "6 linhas" = 1 bico ativo cada.
- **Aba web "Leituras de Bomba":** `HeaderFechamento.tsx:96` (aba) → `TabLeituras.tsx` → hook
  `useLeituras.ts` (carrega via `getByDate`/`getByDateAndTurno` `:243-262`; `calcLitros` `:383`, `calcVenda` `:401`).
  Persistência: `useSubmissaoFechamento.ts:115-130` monta payload por bico e chama `bulkCreate`.
- **PWA:** cliente anon em `apps/pwa-frentista/src/lib/supabase.ts:1-6` (sem auth). Inserts em
  `src/services/api.ts` (padrão `.from(...).insert(payload).select().single()`). Telas por aba em `App.tsx`
  (`registro|vendas|historico`). **Sem câmera/file input hoje.** **Sem uso de Storage.**
- **Deploy:** `vercel.json` (web) e `apps/pwa-frentista/vercel.json` (PWA) só fazem SPA rewrite.
  **`supabase/functions` não existe** — esta feature cria a primeira Edge Function.

### Anti-padrões a evitar
- ❌ Não colocar a Gemini key em `VITE_*` (vaza no bundle). Só server-side (Edge Function secret).
- ❌ Não usar `gemini-2.0-flash` nem o SDK legado `@google/generative-ai`. Preferir REST direto (sem dep nova) ou `@google/genai`.
- ❌ Não gravar o número lido sem confirmação humana editável.
- ❌ Não inventar bucket de Storage: enviar a foto direto pra Edge Function e descartar (só o número persiste).
- ❌ Não assumir RLS: validar policy de `Leitura` antes de gravar do PWA.

---

## Fase 1 — Edge Function proxy `ler-encerrante` (Gemini OCR)
**Implementar (copiar do padrão oficial `Deno.serve` do Supabase + body Gemini da Fase 0):**
- Criar `supabase/functions/ler-encerrante/index.ts`: recebe `{ imagemBase64, mimeType }`, chama o Gemini
  (`gemini-2.5-flash-lite`, `temperature:0`, `responseMimeType:"application/json"`), devolve `{ numero }`.
  CORS habilitado. Key via `Deno.env.get("GEMINI_API_KEY")`.
- Prompt (pronto): "Voce le o visor (encerrante) de uma bomba de combustivel, digitos mecanicos/7-segmentos
  com casas decimais (ex.: 1716778.963). Extraia APENAS o numero do totalizador principal, preservando os
  digitos apos o separador (use ponto). Sem unidades/texto. Se nao ler com confianca, numero=null.
  Responda SOMENTE {\"numero\":\"...\"}."
- `supabase secrets set GEMINI_API_KEY=...` e `supabase functions deploy ler-encerrante`.

**Verificação:** `curl` na function com uma foto real de visor (base64) retorna `{"numero":"..."}` correto.
Testar 3–5 fotos (nítida, tremida, reflexo). Registrar acurácia.

**Anti-padrões:** key só em secret; não persistir a imagem; validar `imagemBase64` presente (400 se ausente).

## Fase 2 — RLS: permitir o PWA gravar em `Leitura`
**Implementar:**
- Verificar no dashboard a policy de INSERT de `Leitura`. Se restrita a `authenticated`, adicionar policy
  para `anon` espelhando o padrão mobile de `FechamentoFrentista`
  (`supabase/migrations/20251221_create_mobile_tables.sql:26-29`, `with check (true)`), numa nova migration
  `supabase/migrations/<data>_leitura_anon_insert.sql`.
- (Alternativa registrada, NÃO default: autenticar o PWA via Supabase Auth — mais trabalho, fora de escopo agora.)

**Verificação:** insert de teste em `Leitura` com a anon key (script) passa e aparece em `getByDate`.
**Anti-padrão:** não afrouxar SELECT/UPDATE/DELETE — só o INSERT necessário.

## Fase 3 — PWA: UI de captura por foto
**Implementar (nova aba/tela no `App.tsx`, ao lado de registro/vendas/historico):**
- Tela "Leitura de Bomba": carrega os bicos ativos do posto (novo `api.getBicos(postoId)` espelhando
  `bicoService.getWithDetails` — `bico.service.ts:43-59`, mas no PWA). Uma linha por bico.
- Por bico: `<input type="file" accept="image/*" capture="environment">` → `FileReader` → dataURL →
  `split(",")[1]` → POST pra Edge Function `ler-encerrante` (via `supabase.functions.invoke` ou fetch).
- Mostrar o número lido num campo **editável** (inicial e/ou final). Estado de loading/erro.

**Verificação:** tirar foto no celular preenche o campo; número editável antes de salvar.
**Anti-padrões:** sempre editável; tratar erro/timeout da IA sem travar a tela.

## Fase 4 — PWA: gravar em `Leitura`
**Implementar:**
- `api.registrarLeituraBomba(payload)` no PWA (copiar cálculo de `leitura.service.ts:210-221`):
  insere em `Leitura` com `litros_vendidos`/`valor_total` calculados, `preco_litro = bico.combustivel.preco_venda`,
  `posto_id`, `usuario_id` (canônico), e **`turno_id`** conforme decisão abaixo.
- **Decisão turno_id:** para casar com a web, gravar `turno_id = 1` (canônico, consistente com o
  `getOrCreateFechamento` do PWA e a decisão "universal"); OU `null` (como a tela `leituras-diarias`).
  Confirmar com o dono antes; default = `1`.

**Verificação:** após salvar no PWA, a linha existe em `Leitura` (script REST) com litros/valor corretos.
**Anti-padrão:** não duplicar leitura do mesmo bico/dia — checar/atualizar se já existe (espelhar `deleteByShift`/upsert).

## Fase 5 — Web: a leitura aparece na aba "Leituras de Bomba"
**Implementar/validar (sem código novo se possível):**
- Confirmar que `useLeituras` carrega a leitura gravada pelo PWA (via `getByDate`) e computa
  `litros = final-inicial` e `venda = litros × preco_venda`.
- Se a aba estiver presa a turno (`getByDateAndTurno`) e o PWA gravar turno canônico/null, alinhar igual
  fizemos nos "Envios do App" (universal) — trocar para `getByDate` se necessário.

**Verificação:** no navegador (chrome-devtools), a leitura fotografada aparece com litros/venda corretos,
batendo com a referência `docs/data/janeiro_referencia.sqlite` (litros são preço-independentes).

## Fase 6 — Verificação final & aceitação
- Rodar `bunx tsc --noEmit` no PWA e na web (0 erros nos arquivos tocados).
- E2E: foto → número → salvar no PWA → aparece na web com litros corretos.
- Medir acurácia da IA numa amostra de fotos reais (alvo ≥95%); documentar casos de erro.
- `grep` anti-padrões: nenhuma `GEMINI`/`VITE_GEMINI` no bundle client; nenhuma imagem persistida.

---

## Riscos / decisões abertas (confirmar com o usuário/dono)
1. **RLS de `Leitura`** para anon (Fase 2) — verificar produção primeiro.
2. **turno_id** que o PWA grava (1 vs null) — casar com como a web lê.
3. **Acurácia real** do Gemini em 7-segmentos — só medível com fotos reais; pode exigir trocar p/ `gemini-2.5-flash`.
4. **Custo/cota** do free tier — conferir RPM/RPD no AI Studio se o volume subir.
