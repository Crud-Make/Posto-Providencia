// Edge Function: ler-encerrante
// Proxy do Gemini Vision para OCR do papel "IMPRESSAO DE ENCERRANTES" de um posto.
// Recebe { imagemBase64, mimeType } -> devolve { leituras: [{ bico, numero }] } na ordem 1..6.
// A imagem NAO e persistida. Secret necessario: GEMINI_API_KEY.
// Modelo validado nesta conta (2026): gemini-flash-lite-latest (2.x saiu de linha p/ chaves novas).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PROMPT =
  'Esta imagem e um cupom impresso de posto de combustivel intitulado "IMPRESSAO DE ENCERRANTES". ' +
  'Ele lista bicos de bomba, cada linha no formato "Bico: N   VALOR". ' +
  'O VALOR esta em formato brasileiro: ponto como separador de milhar e virgula como decimal, com 3 casas ' +
  '(ex.: "1.861.796,633" significa um milhao oitocentos e sessenta e um mil setecentos e noventa e seis inteiros e 633 milesimos). ' +
  'Extraia TODAS as linhas de bico. Para cada uma, normalize o VALOR para usar PONTO como separador decimal e ' +
  'SEM separador de milhar (ex.: "1.861.796,633" -> "1861796.633"), preservando todos os digitos, inclusive os decimais. ' +
  'Ignore o cabecalho, CNPJ, enderecos, vendas, totais e assinatura. Considere apenas as linhas "Bico: N". ' +
  'Se um valor nao puder ser lido com confianca, use numero=null naquele bico. ' +
  'Responda SOMENTE com JSON, ordenado por bico crescente, no formato: ' +
  '{"leituras":[{"bico":1,"numero":"1861796.633"},{"bico":2,"numero":"694823.433"}]}.';

// Normaliza pt-BR -> ponto decimal, defensivo (caso o modelo devolva "1.861.796,633").
function normalizar(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (!s) return null;
  if (s.includes(',')) {
    // formato pt-BR: pontos sao milhar, virgula e decimal
    s = s.replace(/\./g, '').replace(',', '.');
  }
  return s;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json();
    // Aquecimento: um ping periódico mantém o isolate "quente" e evita o cold
    // start (~15-40s) na hora que o frentista realmente fotografa.
    if (body?.ping) return json({ pong: true });

    const { imagemBase64, mimeType = 'image/jpeg' } = body;
    if (!imagemBase64) return json({ erro: 'imagemBase64 ausente' }, 400);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ erro: 'GEMINI_API_KEY nao configurada' }, 500);

    const model = 'gemini-flash-lite-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const chamarGemini = (temperature: number) =>
      fetch(url, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: imagemBase64 } }, { text: PROMPT }] }],
          generationConfig: {
            temperature,
            responseMimeType: 'application/json',
            // Limita a saída — a resposta é um JSON curto (6 bicos).
            maxOutputTokens: 512,
          },
        }),
      });

    const parseResposta = async (resp: Response): Promise<Array<{ bico: number; numero: string | null }>> => {
      if (!resp.ok) throw new Error(`gemini_http_${resp.status}`);
      const data = await resp.json();
      const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const parsed = JSON.parse(texto);
      const arr = Array.isArray(parsed) ? parsed : parsed?.leituras;
      if (!Array.isArray(arr)) return [];
      return arr
        .map((it: Record<string, unknown>) => ({ bico: Number(it.bico), numero: normalizar(it.numero) }))
        .filter((it) => Number.isFinite(it.bico))
        .sort((a, b) => a.bico - b.bico);
    };

    // Auto-conferencia: 2 chamadas em paralelo (temperature 0 = leitura principal,
    // temperature 0.3 = segunda opiniao independente). Mesma latencia de 1 chamada
    // (rodam em paralelo), sem precisar de outro provedor/API. Se as duas baterem
    // digito a digito, confianca alta; se divergirem, o bico volta marcado pra
    // conferencia manual do frentista antes de enviar.
    const [respPrincipal, respVerificacao] = await Promise.all([chamarGemini(0), chamarGemini(0.3)]);

    let principal: Array<{ bico: number; numero: string | null }>;
    try {
      principal = await parseResposta(respPrincipal);
    } catch {
      return json({ erro: 'resposta_nao_json' }, 502);
    }

    let verificacao: Array<{ bico: number; numero: string | null }> = [];
    try {
      verificacao = await parseResposta(respVerificacao);
    } catch {
      // Segunda chamada falhou (ex.: 502/timeout) — segue só com a principal,
      // sem confianca calculada, em vez de derrubar a leitura toda.
    }

    const porBicoVerificacao = new Map(verificacao.map((v) => [v.bico, v.numero]));
    const leituras = principal.map((l) => {
      const numeroVerificacao = porBicoVerificacao.get(l.bico);
      const confianca = numeroVerificacao === undefined ? null : numeroVerificacao === l.numero;
      return { ...l, confianca };
    });

    return json({ leituras });
  } catch (e) {
    return json({ erro: String(e) }, 500);
  }
});
