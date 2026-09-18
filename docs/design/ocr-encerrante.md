# OCR do encerrante — Design Doc

Issue: #98 (mãe: #60) · Estado: **rascunho — sem pendência com o dono** · Data: 17/09/2026

> Porta `supabase/functions/ler-encerrante` (Deno, 609 linhas com teste) para `backend/`.
> Não é fórmula de dinheiro, mas **alimenta uma**: o número lido vira `encerrante_final`, e
> `litros = final − inicial` é a base de toda venda. Leitura errada aqui é dinheiro errado lá.
> Fonte: `supabase/functions/ler-encerrante/{index,guardas}.ts` e a skill `fechamento-posto-providencia`.

## 1. Contexto — o que muda para quem está fora

Nada, por construção. O contrato de entrada e saída é **idêntico**, para que
`frontend/packages/api-core/src/encerrante.ts` não mude de forma. A Edge Function continua de pé até
o cutover (#105); `api-core` escolhe o destino por `VITE_API_URL`.

## 2. Subsistema

`App\Encerrante` — camadas do §2 do Design Doc da Fase A (Http → Application → Domain →
Compartilhado). **Não há entidade nova e nada é persistido**: a foto entra, os números saem, a
imagem não é gravada (igual hoje). Quem grava a leitura é o PWA, depois da conferência humana.

### DECISÃO 1 — é Query, não Command. Sem fila.

O §5 manda encapsular mudança de estado em Command/Job com fila Redis. **Aqui não se aplica**: o
endpoint não muda estado. E a chamada precisa ser **síncrona** — o frentista está parado na tela
esperando os 6 números para conferir antes de enviar. Jogar na fila obrigaria polling e pioraria a
UX sem ganhar nada. Fica `Http::pool` síncrono, como é hoje.

## 3. Componentes

Decompor é requisito, não gosto: o `Deno.serve` de hoje é **um handler único** e um porte literal
estouraria o CCN ≤ 10 do PHPMD no primeiro `composer gates`.

| Componente | Responsabilidade |
|---|---|
| `LerEncerranteRequest` (FormRequest) | `imagemBase64` obrigatório, `mimeType` na lista, **teto 2 MiB** de imagem e 3 MiB de corpo |
| `LimitaOcr` (middleware) | rate limit — ver DECISÃO 2 |
| `LeitorDeEncerrante` (Application) | as 2 chamadas ao Gemini em `Http::pool` |
| `ConfereLeituras` (Application) | auto-conferência dígito a dígito — **o coração desta issue** |
| `NormalizaNumero` (Compartilhado) | pt-BR → ponto decimal, defensivo |
| `LeituraOcrResource` | serializa `{leituras:[{bico,numero,confianca}]}` |

## 4. Comportamento

### A auto-conferência — portar sem "melhorar"

Hoje o Gemini é chamado **duas vezes em paralelo**: `temperature 0` (leitura principal) e
`temperature 0.3` (segunda opinião independente). Mesma latência de uma chamada. Compara-se
**dígito a dígito**:

- bateram → `confianca: true`
- divergiram → `confianca: false`, e o bico volta marcado para conferência manual
- **segunda chamada falhou** (502/timeout) → segue só com a principal e `confianca: null`, em vez de
  derrubar a leitura toda

Esse `null` é deliberado e precisa sobreviver ao porte: **três estados, não um booleano**. Um porte
que colapse `null` em `false` transforma "não deu para conferir" em "conferiu e deu errado", e o
frentista passa a desconfiar de leitura boa.

O prompt vai **literal**, incluindo a instrução de normalizar `1.861.796,633` → `1861796.633` e de
devolver `numero: null` quando não der para ler com confiança. Reescrever prompt é mudar o
comportamento do OCR sem teste que pegue — fica fora desta issue.

### DECISÃO 2 — o posto vai na rota (decidido)

A issue pede limite "por IP e por posto". Hoje só existe por IP (`identificarCliente`), porque a Edge
Function não sabe de posto. Para limitar por posto **antes** de a #102 trazer autenticação, o posto
precisa vir na URL:

```
POST /api/postos/{posto}/encerrante/ocr     ← proposto
POST /api/encerrante/ocr                    ← o que a issue escreveu
```

A forma proposta reaproveita o `DefinePostoAtual` da #97 (404 de posto inexistente) e deixa o limite
por posto sair de graça. Custo: `api-core` passa a montar a URL com o posto — uma linha no
transporte, sem mudar a forma do corpo nem da resposta. **Decisão minha, é engenharia, não regra de
negócio:** o limite por posto é requisito da issue e sem o posto na rota ele não existe antes da #102.

Limites a preservar (medidos e justificados no `guardas.ts` atual):

| Caminho | Limite |
|---|---|
| OCR | **6/min e 40/hora** |
| Pedidos gerais | 60/min |
| `ping` de aquecimento | 30/min |

Ganho real do porte: hoje o limitador é um `Map` em memória com teto de 5000 chaves — some a cada
cold start da Edge Function. O `RateLimiter` do Laravel com Redis é **persistente e compartilhado**.
Não é porte, é conserto.

## 5. Contratos

`POST /api/postos/{posto}/encerrante/ocr`

```json
{ "imagemBase64": "…", "mimeType": "image/jpeg" }
```

```json
{ "leituras": [
  { "bico": 1, "numero": "1861796.633", "confianca": true  },
  { "bico": 2, "numero": "694823.433",  "confianca": false },
  { "bico": 3, "numero": null,          "confianca": null  }
] }
```

`numero` é **string**, nunca float — é a mesma regra de dinheiro da #97, pelo mesmo motivo: o
encerrante tem 3 casas decimais e passar por float perde dígito.

Erros preservados: `422` validação, `413` corpo grande demais, `429` limite, `502`
`{"erro":"resposta_nao_json"}`, `500` genérico.

## Testes

- **Unit, determinístico, sem rede** — é onde mora o valor:
  - `ConfereLeituras`: bate → `true`; diverge → `false`; verificação vazia → `null`; bico presente só
    numa das respostas; ordem trocada entre as duas respostas.
  - `NormalizaNumero`: `"1.861.796,633"` → `"1861796.633"`; já normalizado passa intacto; lixo → `null`.
  - Guardas: 2 MiB, 3 MiB, os três limites da tabela.
- **Feature com `Http::fake()`** — as duas chamadas ao Gemini falsificadas, incluindo o caso em que a
  segunda devolve 502. **Nenhum teste chama o Gemini de verdade**: custaria dinheiro, seria instável
  e exigiria a chave no CI.
- **Conferência manual, fora do CI**: as fixtures de foto dos testes do `pwa-dono` rodadas contra o
  Gemini real uma vez, comparando com a saída da Edge Function no mesmo papel. É o aceite da issue.
- `composer gates` verde — em especial PHPMD, que é o motivo da decomposição da §3.

## Riscos e decisões em aberto

- **DECISÃO 4 — a Edge Function fica congelada até o cutover (decidido).** `guardas.ts` tem 198
  linhas de teste que não vêm no porte; a cobertura é recriada em Pest. Enquanto os dois existirem
  lado a lado, **nenhuma correção entra só de um lado**: bug encontrado vira correção nos dois ou
  espera o cutover. Duas implementações divergindo em silêncio é pior que uma congelada.
- ⚠️ **`gemini-flash-lite-latest` é um alias móvel.** O modelo pode mudar por baixo sem aviso, e isso
  muda acurácia de OCR que vira dinheiro. Recomendo **fixar a versão** no `.env` do backend e tratar
  troca de modelo como mudança que exige a conferência manual acima.
- 🔒 **Chave do Gemini.** Já houve chave exposta em texto puro neste repo (`check_llms.py`, removida
  em `4832ecf`). A `GEMINI_API_KEY` entra **só** no `.env` do backend, nunca versionada — e confirmar
  que a chave antiga foi de fato revogada antes de emitir a nova.
- A foto **não é persistida** hoje e não passa a ser. Se algum dia for, é issue própria com decisão de
  retenção — foto de cupom tem CNPJ e endereço do posto.
- `frontend/packages/api-core/src/encerrante.ts` tem 665 linhas e é o 3º maior arquivo do monorepo.
  Esta issue toca só o trecho de transporte (`:233,246`); decompor o arquivo é outra tarefa.
