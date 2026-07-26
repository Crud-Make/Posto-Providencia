// Edge Function: ler-encerrante
// Proxy do Gemini Vision para OCR de encerrante (visor de bomba).
// Recebe { imagemBase64, mimeType } → devolve { numero }. A imagem NÃO é persistida.
// Secret necessário: GEMINI_API_KEY (supabase secrets set GEMINI_API_KEY=...).
// Modelo validado nesta conta (2026): gemini-flash-lite-latest (2.x saiu de linha p/ chaves novas).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMPT =
  'Voce le o visor (encerrante) de uma bomba de combustivel, digitos mecanicos ou de 7 segmentos, ' +
  'geralmente com casas decimais apos um ponto ou virgula (ex.: 1716778.963). ' +
  'Extraia APENAS o numero do totalizador principal, preservando todos os digitos, inclusive apos o separador. ' +
  'Use ponto como separador decimal. Sem unidades, R$, litros, nem texto. ' +
  'Se houver mais de um numero, escolha o do totalizador/encerrante. ' +
  'Se nao conseguir ler com confianca, numero=null. ' +
  'Responda SOMENTE com JSON: {"numero":"1716778.963"}.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const { imagemBase64, mimeType = 'image/jpeg' } = await req.json();
    if (!imagemBase64) return json({ erro: 'imagemBase64 ausente' }, 400);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ erro: 'GEMINI_API_KEY nao configurada' }, 500);

    const model = 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: imagemBase64 } }, { text: PROMPT }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    });

    if (!resp.ok) return json({ erro: `gemini_http_${resp.status}`, detalhe: (await resp.text()).slice(0, 300) }, 502);
    const data = await resp.json();
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    let numero: string | null = null;
    try { numero = JSON.parse(texto)?.numero ?? null; } catch { numero = texto || null; }
    return json({ numero });
  } catch (e) {
    return json({ erro: String(e) }, 500);
  }
});
