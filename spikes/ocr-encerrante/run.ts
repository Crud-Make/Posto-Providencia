/**
 * SPIKE DESCARTÁVEL — mede acurácia de OCR de encerrante (visor de bomba).
 * NÃO é código de produção. Objetivo: responder "o OCR bate a barra (~95%) em foto real?"
 * antes de investir na feature. Jogar fora depois de decidir.
 *
 * Uso:
 *   1) Ponha 15-20 fotos reais em spikes/ocr-encerrante/fotos/ (jpg/png/webp)
 *   2) Preencha spikes/ocr-encerrante/gabarito.json  { "foto1.jpg": "1716778.963", ... }
 *   3) export GEMINI_API_KEY=xxx   (Google AI Studio, free)
 *   4) bun spikes/ocr-encerrante/run.ts
 *
 * Opcional: SLEEP_MS (padrão 4500, p/ respeitar ~15 RPM do free tier),
 *           MODELOS="gemini-2.5-flash-lite,gemini-2.5-flash" (qual(is) testar).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIR = join(import.meta.dir);
const FOTOS = join(DIR, 'fotos');
const GABARITO = join(DIR, 'gabarito.json');
const KEY = process.env.GEMINI_API_KEY;
const SLEEP_MS = Number(process.env.SLEEP_MS ?? 4500);
// Modelos validados nesta conta (2026): o 2.5 saiu de linha p/ chaves novas.
const MODELOS = (process.env.MODELOS ?? 'gemini-flash-lite-latest,gemini-3.5-flash').split(',').map(s => s.trim());

const PROMPT =
  'Voce le o visor (encerrante) de uma bomba de combustivel, digitos mecanicos ou de 7 segmentos, ' +
  'geralmente com casas decimais apos um ponto ou virgula (ex.: 1716778.963). ' +
  'Extraia APENAS o numero do totalizador principal, preservando todos os digitos, inclusive apos o separador. ' +
  'Use ponto como separador decimal. Sem unidades, R$, litros, nem texto. ' +
  'Se houver mais de um numero, escolha o do totalizador/encerrante. ' +
  'Se nao conseguir ler com confianca, numero=null. ' +
  'Responda SOMENTE com JSON: {"numero":"1716778.963"}.';

const mime = (f: string) => ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic' }[extname(f).toLowerCase()] ?? 'image/jpeg');
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const norm = (s: string) => s.trim().replace(/\s/g, '').replace(',', '.');
const digits = (s: string) => s.replace(/\D/g, '');

async function lerGemini(model: string, base64: string, mimeType: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: base64 } }, { text: PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  if (!resp.ok) return `ERRO_HTTP_${resp.status}`;
  const data = await resp.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try { return JSON.parse(texto)?.numero ?? null; } catch { return texto || null; }
}

async function main() {
  if (!KEY) { console.error('❌ Defina GEMINI_API_KEY'); process.exit(1); }
  if (!existsSync(GABARITO)) { console.error(`❌ Falta ${GABARITO}`); process.exit(1); }
  const gabarito: Record<string, string> = JSON.parse(readFileSync(GABARITO, 'utf8'));
  const fotos = existsSync(FOTOS) ? readdirSync(FOTOS).filter(f => /\.(jpe?g|png|webp|heic)$/i.test(f)) : [];
  const alvos = fotos.filter(f => gabarito[f] != null);
  if (!alvos.length) { console.error('❌ Nenhuma foto com gabarito. Preencha gabarito.json e ponha as fotos em fotos/'); process.exit(1); }

  console.log(`\n🔬 SPIKE OCR encerrante — ${alvos.length} fotos × ${MODELOS.length} modelo(s)\n`);
  const acertos: Record<string, { exato: number; digitos: number }> = {};
  MODELOS.forEach(m => (acertos[m] = { exato: 0, digitos: 0 }));
  const falhas: string[] = [];

  for (const foto of alvos) {
    const esperado = gabarito[foto];
    const base64 = readFileSync(join(FOTOS, foto)).toString('base64');
    for (const model of MODELOS) {
      const lido = await lerGemini(model, base64, mime(foto));
      const okExato = lido != null && norm(lido) === norm(esperado);
      const okDigitos = lido != null && digits(lido) === digits(esperado);
      if (okExato) acertos[model].exato++;
      if (okDigitos) acertos[model].digitos++;
      const tag = okExato ? '✅' : okDigitos ? '≈ (só separador)' : '❌';
      console.log(`${tag}  ${foto}  [${model}]  esperado=${esperado}  lido=${lido}`);
      if (!okExato) falhas.push(`${foto} [${model}] esperado=${esperado} lido=${lido}`);
      await sleep(SLEEP_MS);
    }
  }

  console.log(`\n===== RESULTADO (${alvos.length} fotos) =====`);
  for (const m of MODELOS) {
    const a = acertos[m];
    console.log(`  ${m}:  exato ${a.exato}/${alvos.length} (${(100 * a.exato / alvos.length).toFixed(1)}%)  |  dígitos certos ${a.digitos}/${alvos.length} (${(100 * a.digitos / alvos.length).toFixed(1)}%)`);
  }
  if (falhas.length) { console.log('\n----- Falhas (exato) -----'); falhas.forEach(f => console.log('  ' + f)); }
  console.log('\n👉 Barra pra construir: ~95% exato. Abaixo disso, repensar (foto guiada, modelo maior, confirmação humana).');
}
main();
