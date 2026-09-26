---
name: realtime-fica-no-laravel
description: 21/09 dono decidiu — o realtime do painel vai para o Laravel (não fica no Supabase nem vira polling); e ele só faz sentido DEPOIS que a escrita do PWA migrar
metadata: 
  node_type: memory
  type: project
  originSessionId: 05f6fde6-e78e-4fb4-ada0-87339211356e
  modified: 2026-09-22T01:43:42.865Z
---

Decisão do dono em 21/09/2026: **o realtime continua existindo e vai para o Laravel.**
Descartadas as duas alternativas que estavam em aberto: manter o canal do Supabase só para
notificar, e trocar por polling.

Hoje são 3 canais Supabase no painel: `components/fechamento-diario/index.tsx:98` e `:126`, e
`components/fechamento-diario/hooks/useCarregamentoDados.ts:216`. É o que faz a tela do
gerente acordar sozinha quando o frentista envia pelo PWA.

**Why:** sem realtime o gerente não vê o envio do frentista chegar — ele fecha o dia com a
tela velha, que é exatamente o defeito de [[dois-bugs-do-salvar-do-painel]] (o painel apaga o
envio que chegou depois da tela carregar). Polling foi descartado porque troca um problema de
frescor por um de carga, e manter o Supabase só para o aviso deixaria uma dependência viva
depois do cutover (#105), contra o motivo de a refatoração existir
([[porque-multitenant-e-o-destino]]).

**How to apply:** ordem importa — **o realtime no Laravel só faz sentido DEPOIS que a escrita
do PWA do frentista migrar** (fatia "PWA envio"). Enquanto o PWA gravar pelo Supabase, um
evento emitido pelo Laravel não teria o que anunciar: quem escreve é quem dispara. Logo o
realtime entra como fatia **seguinte** à do envio, nunca antes. O módulo `App\Fechamento` já
emite evento de domínio (`LeiturasDoDiaGravadas`, ouvido por `App\Estoque`), então a peça que
falta é o broadcast: canal **privado por posto** (o escopo do tenant vale para o canal também,
ver [[multi-tenant-impossivel-sem-migration]]) e o cliente trocando `supabase.channel()` pelo
Echo. Recomendado: **Laravel Reverb** (first-party, mapeia 1:1 o modelo de canal do Supabase);
SSE é o plano B se não valer subir outro container.
