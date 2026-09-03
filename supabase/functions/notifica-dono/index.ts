// Edge Function: notifica-dono
//
// Avisa o celular do dono que um frentista acabou de enviar o fechamento.
//
// Web Push é padrão de navegador: não há Firebase, nem FCM, nem conta paga da
// Apple no caminho. O endpoint de cada inscrição já aponta para o serviço do
// fabricante (no iPhone, `web.push.apple.com`); o que fazemos aqui é cifrar o
// conteúdo e assinar com VAPID.
//
// Secrets necessários: VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT,
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CABECALHOS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CABECALHOS_CORS, 'Content-Type': 'application/json' },
  });

/**
 * Monta o texto do aviso a partir da linha REAL do banco.
 *
 * @remarks Nada do que o cliente mandou entra na mensagem — só o `id`. É o que
 *          impede alguém com a `anon key` de disparar um aviso inventado no
 *          celular do dono: o pior que consegue é reenviar o eco de um
 *          fechamento que existe de verdade.
 * @remarks **Sem dinheiro no texto, de propósito.** A notificação aparece com o
 *          iPhone BLOQUEADO, à vista de quem estiver por perto — inclusive dos
 *          próprios frentistas. Valor conferido e falta de caixa são o assunto
 *          mais sensível do posto e ficam atrás do desbloqueio, na tela de
 *          envios do app. O aviso é só o empurrão para abrir.
 */
function montarAviso(linha: { frentista: { nome: string } | null; data: string | null }) {
  const nome = linha.frentista?.nome ?? 'Um frentista';
  const dia = formatarDia(linha.data);

  return {
    titulo: `${nome} fechou o caixa`,
    corpo: `${dia} · toque para ver os envios`,
  };
}

/**
 * `"2026-09-03T00:00:00+00:00"` → `"03/09"`.
 *
 * @remarks `Fechamento.data` é `timestamptz`, não `date`: o PostgREST devolve o
 *          ISO completo. A versão anterior colava `'T00:00:00'` nele e o
 *          `new Date()` virava `Invalid Date` — foi o que o dono viu no
 *          celular em 02/09/2026. Recorta o `AAAA-MM-DD` e monta o texto sem
 *          passar por `Date`: o dia gravado é o dia do fechamento, e converter
 *          para o fuso do runtime escorregaria um dia para trás.
 */
function formatarDia(data: string | null): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(data ?? '');
  if (!partes) return 'hoje';

  return `${partes[3]}/${partes[2]}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS_CORS });
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405);

  const chavePublica = Deno.env.get('VAPID_PUBLIC_KEY');
  const chavePrivada = Deno.env.get('VAPID_PRIVATE_KEY');
  const assunto = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:posto@providencia.local';
  if (!chavePublica || !chavePrivada) return json({ erro: 'Chaves VAPID ausentes no ambiente.' }, 500);

  let corpoPedido: { fechamentoFrentistaId?: number };
  try {
    corpoPedido = await req.json();
  } catch {
    return json({ erro: 'Corpo inválido.' }, 400);
  }

  const id = Number(corpoPedido.fechamentoFrentistaId);
  if (!Number.isInteger(id) || id <= 0) return json({ erro: 'fechamentoFrentistaId inválido.' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Só nome e data saem daqui: o valor nem é buscado, para não haver como
  // vazar por descuido num `console.log` ou num payload futuro.
  const { data: linha, error: erroLinha } = await supabase
    .from('FechamentoFrentista')
    .select('id, frentista:Frentista(nome), fechamento:Fechamento(data)')
    .eq('id', id)
    .maybeSingle();

  if (erroLinha) return json({ erro: erroLinha.message }, 500);
  if (!linha) return json({ erro: 'Fechamento não encontrado.' }, 404);

  const aviso = montarAviso({
    frentista: linha.frentista as { nome: string } | null,
    data: (linha.fechamento as { data: string } | null)?.data ?? null,
  });

  const { data: inscricoes, error: erroInscricoes } = await supabase
    .from('InscricaoPush')
    .select('id, endpoint, p256dh, auth')
    .eq('papel', 'dono')
    .eq('ativa', true);

  if (erroInscricoes) return json({ erro: erroInscricoes.message }, 500);
  if (!inscricoes?.length) return json({ enviados: 0, motivo: 'Nenhum aparelho inscrito.' });

  webpush.setVapidDetails(assunto, chavePublica, chavePrivada);

  const payload = JSON.stringify({ ...aviso, fechamentoFrentistaId: id });
  let enviados = 0;
  const mortas: number[] = [];

  for (const inscricao of inscricoes) {
    try {
      // `generateRequestDetails` cifra e assina sem tocar na pilha HTTP do Node —
      // é o que faz esta biblioteca funcionar em Deno. O envio é `fetch` puro.
      const detalhes = webpush.generateRequestDetails(
        { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
        payload,
      );

      const resposta = await fetch(detalhes.endpoint, {
        method: 'POST',
        headers: detalhes.headers as Record<string, string>,
        body: detalhes.body,
      });

      if (resposta.ok) enviados++;
      // 404/410 = inscrição morta: app desinstalado, permissão revogada, ou o
      // aparelho trocou de endpoint. Insistir nela é erro em toda notificação
      // futura, para sempre.
      else if (resposta.status === 404 || resposta.status === 410) mortas.push(inscricao.id);
      else console.error('push recusado', resposta.status, await resposta.text());
    } catch (err) {
      console.error('falha ao enviar push', err instanceof Error ? err.message : err);
    }
  }

  if (mortas.length) {
    await supabase.from('InscricaoPush').update({ ativa: false }).in('id', mortas);
  }
  if (enviados) {
    await supabase.from('InscricaoPush').update({ usada_em: new Date().toISOString() })
      .eq('papel', 'dono').eq('ativa', true);
  }

  return json({ enviados, desativadas: mortas.length });
});
