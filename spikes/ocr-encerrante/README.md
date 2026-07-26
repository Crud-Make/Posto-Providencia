# Spike — OCR de encerrante (DESCARTÁVEL)

Responde **uma** pergunta antes de construir a feature: *o OCR lê o visor da bomba com acurácia
suficiente (~95%) em fotos reais?* Se sim, seguimos pro plano (`plans/ocr-encerrante-gemini.md`,
hoje parqueado). Se não, repensamos (foto guiada, modelo maior, confirmação humana) ou desistimos.

**Não é produção. Jogar fora depois de decidir.**

## Como rodar
1. Ponha **15–20 fotos reais** dos visores em `fotos/` — variadas de propósito: tremida, reflexo,
   dia/noite, ângulo, bomba diferente. Quanto mais realista o pior caso, melhor a medição.
2. Preencha `gabarito.json`: para cada arquivo, o número **digitado à mão** (a verdade).
   Ex.: `{ "bomba01_dia.jpg": "1716778.963" }`. (Apague a linha `COMENTARIO`.)
3. `export GEMINI_API_KEY=xxx` (Google AI Studio — free tier).
4. `bun spikes/ocr-encerrante/run.ts`

## O que ele mede
- Por foto e por modelo: ✅ exato / ≈ (só o separador decimal errou) / ❌.
- Resumo: **% exato** e **% dígitos certos** por modelo (`gemini-2.5-flash-lite` e `gemini-2.5-flash`).
- Lista das falhas (esperado vs lido) — pra ver PADRÃO de erro (ex.: confunde 8/0, perde casas decimais).

## Opções (env)
- `MODELOS="gemini-2.5-flash-lite"` — testar só um.
- `SLEEP_MS=4500` — pausa entre chamadas (respeita ~15 RPM do free tier).

## Veredito
≥95% exato → vale construir. Entre 80–95% → talvez com confirmação humana obrigatória. <80% → não vale
do jeito atual. Anotar o número e o padrão de erro na decisão.
