---
name: edge-function-verify-jwt-nao-protege
description: verify_jwt=true numa Edge Function não barra quem tem a anon key — a anon key É um JWT válido; para custo por chamada isso é ausência total de trava
metadata:
  type: project
---

O padrão do Supabase CLI é publicar Edge Function com `verify_jwt = true`, e é fácil ler isso
como "só entra quem está logado". **Não é.** A `anon key` é um JWT assinado com `role: anon`,
e o `supabase.functions.invoke` a manda como `Authorization: Bearer <anon key>`. Uma função com
`verify_jwt = true` **aceita qualquer requisição que carregue a chave anônima** — que é pública
por definição, vai no bundle do front e sai num `view-source`.

Para função que só lê dado já público, tanto faz. Para função que **gasta dinheiro por chamada**
(proxy de LLM, envio de SMS, storage), `verify_jwt` não é trava nenhuma: é cota aberta ao mundo.

**Why:** apurado em 16/08/2026 na `ler-encerrante`, proxy do Gemini Vision com `GEMINI_API_KEY`
em secret. O código dela (`supabase/functions/ler-encerrante/index.ts`) não faz **nenhuma**
verificação própria — nem de origem, nem de usuário, nem de tamanho de imagem —, tem
`Access-Control-Allow-Origin: '*'`, e cada requisição dispara **duas** chamadas ao Gemini
(auto-conferência em temperature 0 e 0.3). Um POST anônimo custa o dobro do que parece.

**How to apply:**
- Nunca escrever "a função exige JWT, então está protegida". A frase correta é: *exige um JWT;
  a anon key é um, logo qualquer um com o bundle do front passa*.
- Trava real para custo por chamada é uma destas, e nenhuma existe hoje: segredo compartilhado
  próprio no header, rate limit por IP dentro da função, ou exigir `role = authenticated` lendo
  o claim do JWT em vez de só validá-lo.
- Não há `supabase/config.toml` no repo (conferido 16/08/2026), então o `verify_jwt` efetivo é
  o que ficou no deploy e **só se confere no Dashboard ou por `supabase functions list`** — as
  ferramentas MCP deste agente não enxergam Edge Function.
- O `{ ping: true }` de aquecimento é resposta barata e sem custo de LLM; o caro é o caminho com
  `imagemBase64`.

Por que um app novo não muda essa conta: [[app-novo-nao-amplia-privilegio]].
