/**
 * A paleta e a tipografia da planilha, portadas do desenho aprovado.
 *
 * @remarks CSS escrito à mão, e não classes utilitárias, por duas razões: o
 *          desenho depende de `color-mix` com a cor do produto (que não existe
 *          como classe) e de uma tabela com borda em toda célula — passar isso
 *          para utilitário triplicaria o tamanho do JSX sem ganhar nada.
 *
 *          As cores vivem em variáveis e trocam pelo `.dark` do app, que é o
 *          mesmo interruptor das outras telas. O desenho original trazia um
 *          botão de tema próprio; ele saiu, porque dois controles de tema na
 *          mesma página discordam na primeira vez que alguém usa um deles.
 */
export const ESTILOS_PLANILHA = `
.pm {
  --bg: #eef1ef; --panel: #ffffff; --ink: #141715; --muted: #5d6560; --muted2: #3d443f;
  --line: #cfd6d1; --line2: #b9c2bc; --thead: #f4f6f4; --track: #f0f3f1; --trackline: #dfe5e0;
  --pos: #0f7a45; --neg: #c1121f;
  --venda: #f6c795; --venda-linha: #b9962f; --venda-tinta: #5a4126; --venda-barra: #e8933c;
  --compra: #93c3d9; --compra-linha: #5d94ad; --compra-tinta: #1f4457; --compra-barra: #4d9cbd;
  --custo: #c9b98a;
  --estoque: #5fe39b; --estoque-linha: #2aa96b; --estoque-tinta: #0f4a2c; --estoque-barra: #2fbf76;
  /* Única matiz que não pertence a nenhum produto nem a nenhum bloco — por isso
     serve de acento: é ela que marca "aqui se digita" e "aqui está o foco". */
  --acento: #0b6b8f;
  background: var(--bg); color: var(--ink);
  font-family: 'Barlow Semi Condensed', 'Inter', Helvetica, Arial, sans-serif;
  min-height: 100%; box-sizing: border-box;
  padding: 12px 20px 40px;
  display: flex; flex-direction: column; align-items: stretch; gap: 18px;
  transition: background .25s ease, color .25s ease;
}
.dark .pm {
  --bg: #121513; --panel: #1c211d; --ink: #e8ece8; --muted: #98a29b; --muted2: #c3cbc5;
  --line: #39413b; --line2: #4a534d; --thead: #232924; --track: #262c27; --trackline: #333b35;
  --pos: #4ade80; --neg: #ff7575;
  /* As cores de bloco PRECISAM de par escuro. Sem ele, as faixas "Venda",
     "Compra" e "Estoque" e as três linhas de total continuavam com o pastel
     do tema claro em saturação plena sobre um painel #1c211d — viravam os
     seis objetos mais claros da página, mais claros que o Lucro líquido. O
     olho ia para o rótulo da seção, que nunca é a resposta que a tela existe
     para dar. A regra aqui é inverter os papéis: o fundo escurece e a tinta
     do bloco clareia, preservando a identidade de cor de cada seção.
     As cores de barra NÃO mudam: são marca de dado sobre trilho, não fundo. */
  --venda: #4a3a1e; --venda-linha: #8a6f2a; --venda-tinta: #f0d9a8;
  --compra: #1e3a49; --compra-linha: #3f7189; --compra-tinta: #bfe0f0;
  --custo: #3a3423;
  --estoque: #14402a; --estoque-linha: #2aa96b; --estoque-tinta: #a8ecc6;
  --acento: #63b3d1;
}
.pm__mono { font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
/* Ocupa a largura que a área de conteúdo do app oferecer. O desenho original
   travava em 1420px, o que deixava 236px de vazio num monitor de 1920 — numa
   tela que é toda tabela larga, esse vazio é coluna espremida à toa. */
.pm__faixa { width: 100%; max-width: none; }

/* ── Cabeçalho ──────────────────────────────────────────────────────────── */
.pm-topo { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
  border-bottom: 2px solid var(--ink); padding-bottom: 10px; flex-wrap: wrap; }
.pm-topo__etiqueta { font-size: 13px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--muted); font-weight: 600; }
.pm-topo__titulo { font-size: 38px; font-weight: 700; line-height: 1.05; margin-top: 2px;
  letter-spacing: -.02em; }
.pm-topo__lado { text-align: right; font-size: 13px; color: var(--muted); line-height: 1.6; }
.pm-topo__lado strong { color: var(--ink); }
.pm-topo__seletor { flex: 1; display: flex; justify-content: center; align-self: flex-end; }

/* ── Aviso de origem do dado ────────────────────────────────────────────── */
.pm-aviso { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px;
  border: 1px solid var(--venda-linha); background: color-mix(in srgb, var(--venda) 22%, var(--panel));
  color: var(--ink); font-size: 13px; line-height: 1.5; }
.pm-aviso strong { font-weight: 700; }

/* ── Tira de alertas — uma linha, não um parágrafo por problema ─────────── */
.pm-alertas { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pm-alerta { font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; font-size: 12px;
  letter-spacing: .04em; text-transform: uppercase; color: var(--venda-tinta);
  background: var(--venda); border: 1px solid var(--venda-linha); padding: 3px 9px;
  cursor: help; white-space: nowrap; }
.pm-alerta::before { content: '⚠ '; }
.pm-alerta--grave { color: #fff; background: var(--neg); border-color: var(--neg); }
.dark .pm-alerta--grave { color: #2b0b0b; }

/* ── KPIs ───────────────────────────────────────────────────────────────── */
.pm-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
@media (max-width: 1100px) { .pm-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .pm-kpis { grid-template-columns: repeat(2, 1fr); } }
.pm-kpi { background: var(--panel); border: 1px solid var(--line); border-top: 4px solid var(--ink);
  padding: 12px 14px; }
.pm-kpi__rotulo { font-size: 12px; letter-spacing: .12em; text-transform: uppercase;
  color: var(--muted); font-weight: 600; }
.pm-kpi__valor { font-size: 30px; font-weight: 600; margin-top: 6px; letter-spacing: -.01em; }
.pm-kpi__nota { font-size: 13px; color: var(--muted); margin-top: 3px; }

/* ── Painéis de síntese ─────────────────────────────────────────────────── */
.pm-sinteses { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
@media (max-width: 1100px) { .pm-sinteses { grid-template-columns: 1fr; } }
.pm-painel { background: var(--panel); border: 1px solid var(--line2); }
.pm-painel__topo { padding: 12px 16px 4px; }
.pm-painel__titulo { margin: 0; font-size: 20px; font-weight: 700; }
.pm-painel__sub { font-size: 12px; color: var(--muted); }
.pm-painel__corpo { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.pm-barra { height: 16px; background: var(--track); border: 1px solid var(--trackline); }
.pm-barra__preenche { height: 100%; transition: width .35s ease; }
.pm-legenda { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
.pm-legenda__nome { font-weight: 600; }
.pm-lucro-bico { display: grid; grid-template-columns: 110px 1fr 110px; align-items: center;
  gap: 10px; font-size: 14px; }
.pm-lucro-bico__nome { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-estoque-barra { position: relative; height: 16px; background: var(--track);
  border: 1px solid var(--trackline); }
.pm-estoque-barra__marca { position: absolute; top: 0; bottom: 0; width: 3px; background: var(--ink); }
.pm-estoque-barra__pes { display: flex; justify-content: space-between; font-size: 12px;
  color: var(--muted); margin-top: 3px; }

/* ── Seções (Venda / Compra / Estoque) ──────────────────────────────────── */
.pm-secao { background: var(--panel); border: 1px solid var(--line2); }
.pm-secao__faixa { padding: 10px 16px; display: flex; align-items: baseline; gap: 14px;
  border-bottom: 1px solid var(--line2); color: var(--ink); flex-wrap: wrap; }
.pm-secao__faixa h2 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -.01em; }
.pm-secao__formula { font-size: 13px; }
.pm-rolagem { overflow-x: auto; }

/* ── Tabelas ────────────────────────────────────────────────────────────── */
/* Número em algarismo tabular: sem isso a coluna dança a cada mês, porque o
   Barlow entrega dígito de largura variável fora do bloco monoespaçado. */
.pm-tabela { width: 100%; border-collapse: collapse; font-size: 16px;
  font-variant-numeric: tabular-nums; }
.pm-tabela th { background: var(--thead); text-align: right; padding: 10px 12px;
  border: 1px solid var(--line); font-size: 13px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--muted2); font-weight: 600; }
.pm-tabela th:first-child { text-align: left; width: 170px; }
.pm-tabela td { padding: 9px 12px; border: 1px solid var(--line); text-align: right; }
.pm-tabela td:first-child { text-align: left; font-weight: 600; font-size: 17px; }
/* Saldo em cor: verde ganhou, vermelho perdeu. Vale só para lucro, margem e
   perca — ver sinal.ts para o porquê de faturamento e litro ficarem de fora. */
.pm-tabela td.pm-num--pos { color: var(--pos); }
.pm-tabela td.pm-num--neg { color: var(--neg); }
.pm-tabela__num { font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }

/* ── Medidor de tanque embutido na célula ───────────────────────────────────
   A célula vira o próprio tanque: o preenchimento é volume ÷ capacidade, e o
   número fica por cima. Serve para ler cheio/vazio sem converter litro em
   fração de cabeça — 5.672 L não diz nada sozinho; 5.672 de 15.000 diz.
   Só aparece quando há capacidade cadastrada. */
.pm-tabela td.pm-medidor { position: relative; }
.pm-medidor__nivel { position: absolute; left: 0; top: 0; bottom: 0; pointer-events: none;
  transform-origin: left; transition: width .2s cubic-bezier(.2,0,0,1); }
.pm-medidor__conteudo { position: relative; }
/* Marca da capacidade: onde o tanque acabaria se estivesse cheio. Só aparece
   quando o volume passa dela — que é impossível físico e precisa gritar. */
.pm-medidor__transbordo { position: absolute; right: 0; top: 0; bottom: 0; width: 3px;
  background: var(--neg); }
@media (prefers-reduced-motion: reduce) { .pm-medidor__nivel { transition: none; } }
.pm-tabela__forte { font-weight: 600; }
/* As DUAS células digitáveis da tela, no meio de ~140 de leitura. O único
   sinal de que se digita aqui era a AUSÊNCIA do tom do produto — diferença de
   poucos por cento de luminância no tema escuro, invisível na prática. O
   filete de acento no pé da célula é o que diz "esta aceita a régua". */
.pm-tabela td.pm-tabela__campo { padding: 0; background: var(--panel);
  box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--acento) 45%, transparent); }
.pm-tabela td.pm-tabela__campo:has(.pm-campo:disabled) { box-shadow: none; }
.pm-total td { font-weight: 700; color: var(--ink); padding: 10px 12px;
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
/* Precisa do seletor de linha para vencer o td:first-child, que é mais
   específico e vinha deixando "Total e média" MAIS LEVE que os números que ele
   totaliza — o inverso do que a linha de total quer dizer. */
.pm-tabela tr.pm-total td:first-child { font-family: inherit; font-weight: 700; }
.pm-total--venda td { background: var(--venda); border: 1px solid var(--venda-linha); }
.pm-total--compra td { background: var(--compra); border: 1px solid var(--compra-linha); }
.pm-total--estoque td { background: var(--estoque); border: 1px solid var(--estoque-linha); }

.pm-secao__faixa--venda { background: var(--venda); }
.pm-secao__faixa--venda .pm-secao__formula { color: var(--venda-tinta); }
.pm-secao__faixa--compra { background: var(--compra); }
.pm-secao__faixa--compra .pm-secao__formula { color: var(--compra-tinta); }
.pm-secao__faixa--custo { background: var(--custo); }
.pm-secao__faixa--estoque { background: var(--estoque); }
.pm-secao__faixa--estoque .pm-secao__formula { color: var(--estoque-tinta); }

.pm-tabela--venda { min-width: 1280px; }
.pm-tabela--compra { min-width: 640px; }
.pm-tabela--estoque { min-width: 960px; }

/* Campo digitável: a planilha do dono também tem célula clara para digitar. */
.pm-campo { width: 100%; box-sizing: border-box; padding: 9px 12px; border: 0;
  background: transparent; text-align: right; font-size: 16px; color: var(--ink);
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
/* O anel de foco usava a cor de texto encostada na borda de 1px da célula: lia
   como borda dobrada, não como foco. O acento é a única matiz que não disputa
   com produto nem com bloco, então só ele significa "o teclado está aqui". */
.pm-campo:hover:not(:disabled) { background: color-mix(in srgb, var(--ink) 6%, transparent); }
.pm-campo:focus-visible { outline: 2px solid var(--acento); outline-offset: -2px; }

/* ── Estados: vazio, carregando, campo travado ──────────────────────────── */
.pm-campo::placeholder { color: var(--muted); opacity: .6; font-weight: 400; }
.pm-campo:disabled { color: var(--muted); cursor: not-allowed; }
/* Mesmo pedágio de especificidade da linha de total: sem o seletor de linha, o vazio
   saía alinhado à esquerda e em negrito, com cara de linha de dado. */
.pm-tabela tr.pm-vazio td { text-align: center; color: var(--muted); padding: 24px 12px;
  font-size: 15px; font-weight: 400; border: 1px solid var(--line); }
.pm-carregando { color: var(--muted); padding: 40px 0; text-align: center; font-size: 16px; }
.pm-tabela td.pm-tabela__texto { text-align: right; }
.pm-tabela__aviso { margin-left: 8px; font-size: 11px; text-transform: uppercase;
  letter-spacing: .08em; color: var(--muted); border: 1px solid var(--line2); padding: 2px 6px;
  font-weight: 500; }
.pm-gpe__vazio { color: var(--muted); font-size: 13px; margin: 14px 0 4px; }

/* ── Gráficos ───────────────────────────────────────────────────────────── */
.pm-gpe { padding: 16px 16px 14px; border-top: 1px solid var(--line); }
.pm-gpe__topo { display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  flex-wrap: wrap; }
.pm-gpe__titulo { font-size: 15px; font-weight: 700; }
.pm-gpe__etiqueta { font-size: 10px; color: var(--muted); border: 1px solid var(--line);
  padding: 1px 6px; border-radius: 2px; }
.pm-gpe__legendas { display: flex; align-items: center; gap: 16px; font-size: 11px;
  color: var(--muted); flex-wrap: wrap; }
.pm-gpe__legenda { display: inline-flex; align-items: center; gap: 6px; }
.pm-gpe__amostra { width: 9px; height: 9px; border-radius: 2px; }
.pm-gpe__traco { width: 14px; height: 2px; background: var(--ink); }
.pm-gpe__stat { color: var(--muted2); font-weight: 600; }
.pm-plano { position: relative; height: 150px; margin-top: 14px; border-bottom: 1px solid var(--line); }
.pm-plano__guia { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--trackline); }
.pm-plano__pico { position: absolute; top: 2px; left: 2px; font-size: 9px; color: var(--muted);
  background: var(--panel); padding: 0 4px; }
.pm-plano__barras { position: absolute; inset: 0; display: flex; align-items: flex-end;
  gap: 3px; padding: 0 2px; }
.pm-plano__barra { flex: 1; border-radius: 2px 2px 0 0; min-height: 2px; }
.pm-plano__svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.pm-plano__eixo { display: flex; justify-content: space-between; font-size: 10px;
  color: var(--muted); margin-top: 6px; }
.pm-colunas { position: absolute; inset: 0; display: flex; align-items: flex-end; gap: 16px;
  padding: 0 10px; }
.pm-coluna { flex: 1; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; }
.pm-coluna__rotulo { font-size: 10px; color: var(--muted2); text-align: center; margin-bottom: 3px; }
.pm-coluna__barra { border-radius: 2px 2px 0 0; min-height: 2px; }

/* ── Compra + custo, lado a lado ────────────────────────────────────────── */
/* Uma coluna: "Compra e custo" desceu para baixo da tabela de Compra em vez de
   ficar espremido numa lateral de 300px. A tabela ganha a largura inteira, e o
   painel de custo — que é a origem da corrente do lucro — deixa de ser um
   apêndice de canto. */
.pm-dupla { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; align-items: start; }
/* Já que agora tem largura sobrando, os três blocos de custo ficam lado a lado
   em vez de empilhados num tubo estreito. */
.pm-custo__corpo { padding: 16px; display: grid; gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; }
@media (max-width: 900px) { .pm-custo__corpo { grid-template-columns: 1fr; } }
.pm-custo__rotulo { font-size: 13px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); font-weight: 600; }
.pm-custo__caixa { display: flex; align-items: center; border: 1px solid var(--line);
  background: var(--panel); margin-top: 4px; }
.pm-custo__moeda { padding: 0 8px; color: var(--muted); }
.pm-custo__campo { flex: 1; min-width: 0; box-sizing: border-box; padding: 9px 10px; border: 0;
  background: transparent; text-align: right; font-size: 20px; font-weight: 600; color: var(--ink);
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
.pm-custo__campo:focus-visible { outline: 2px solid var(--acento); outline-offset: -2px; }
/* Lado a lado, o separador é vertical: o tracejado horizontal era o que dividia
   os blocos quando eles vinham empilhados na lateral estreita. */
.pm-custo__bloco { border-left: 1px dashed var(--line); padding-left: 16px; }
@media (max-width: 900px) {
  .pm-custo__bloco { border-left: 0; padding-left: 0;
    border-top: 1px dashed var(--line); padding-top: 12px; }
}
.pm-custo__valor { font-size: 32px; font-weight: 600; margin-top: 4px; letter-spacing: -.01em; }
.pm-custo__nota { font-size: 13px; color: var(--muted); margin-top: 3px; }

/* ── Rodapé ─────────────────────────────────────────────────────────────── */
.pm-rodape { display: flex; justify-content: space-between; align-items: center; gap: 16px;
  font-size: 13px; color: var(--muted); flex-wrap: wrap; }
/* 40px de altura: o alvo de toque anterior tinha 28px, e são os dois únicos
   controles reais da tela. */
.pm-rodape__botao { font-size: 13px; padding: 10px 18px; min-height: 40px;
  background: var(--ink); color: var(--bg);
  border: 0; cursor: pointer; letter-spacing: .06em;
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
.pm-rodape__botao:hover:not(:disabled) { opacity: .8; }
.pm-rodape__botao:focus-visible { outline: 2px solid var(--acento); outline-offset: 2px; }
.pm-rodape__botao--fantasma { background: transparent; color: var(--ink);
  border: 1px solid var(--line2); }
/* Vem DEPOIS da variante fantasma de propósito: senão o fundo transparente
   dela venceria e o estado desabilitado voltaria a não existir.
   A opacidade de 35% compunha fundo E texto contra a página e dava 2,14:1 no
   tema claro — abaixo até do piso de 3:1 de elemento não textual. E não é
   estado de canto: "Gravar medições" nasce desabilitado quando a página abre,
   a régua ainda não digitada. O botão tem de continuar legível parado.
   A tinta é a forte (--muted2), não a fraca: com --muted o contraste ficava em
   4,27:1 no tema claro, ainda abaixo dos 4,5:1. O que faz o botão ler como
   desabilitado é a ausência do preenchimento sólido, não a palavra apagada. */
.pm-rodape__botao:disabled { opacity: 1; cursor: default;
  background: color-mix(in srgb, var(--ink) 10%, transparent); color: var(--muted2);
  border: 1px solid var(--line2); }
.pm-rodape__erro { color: var(--neg); font-weight: 600; }
.pm-aviso--erro { border-color: var(--neg);
  background: color-mix(in srgb, var(--neg) 14%, var(--panel)); }
`;
