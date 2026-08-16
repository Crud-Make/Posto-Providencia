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
  background: var(--bg); color: var(--ink);
  font-family: 'Barlow Semi Condensed', 'Inter', Helvetica, Arial, sans-serif;
  min-height: 100%; box-sizing: border-box;
  padding: 20px 20px 40px;
  display: flex; flex-direction: column; align-items: stretch; gap: 18px;
  transition: background .25s ease, color .25s ease;
}
.dark .pm {
  --bg: #121513; --panel: #1c211d; --ink: #e8ece8; --muted: #98a29b; --muted2: #c3cbc5;
  --line: #39413b; --line2: #4a534d; --thead: #232924; --track: #262c27; --trackline: #333b35;
  --pos: #4ade80; --neg: #ff7575;
}
.pm__mono { font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
/* Ocupa a largura que a área de conteúdo do app oferecer. O desenho original
   travava em 1420px, o que deixava 236px de vazio num monitor de 1920 — numa
   tela que é toda tabela larga, esse vazio é coluna espremida à toa. */
.pm__faixa { width: 100%; max-width: none; }

/* ── Cabeçalho ──────────────────────────────────────────────────────────── */
.pm-topo { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px;
  border-bottom: 2px solid var(--ink); padding-bottom: 10px; flex-wrap: wrap; }
.pm-topo__etiqueta { font-size: 12px; letter-spacing: .22em; text-transform: uppercase;
  color: var(--muted); font-weight: 600; }
.pm-topo__titulo { font-size: 34px; font-weight: 700; line-height: 1.05; margin-top: 2px; }
.pm-topo__lado { text-align: right; font-size: 12px; color: var(--muted); line-height: 1.6; }
.pm-topo__lado strong { color: var(--ink); }

/* ── Aviso de origem do dado ────────────────────────────────────────────── */
.pm-aviso { display: flex; gap: 10px; align-items: flex-start; padding: 10px 14px;
  border: 1px solid var(--venda-linha); background: color-mix(in srgb, var(--venda) 22%, var(--panel));
  color: var(--ink); font-size: 13px; line-height: 1.5; }
.pm-aviso strong { font-weight: 700; }

/* ── KPIs ───────────────────────────────────────────────────────────────── */
.pm-kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
@media (max-width: 1100px) { .pm-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 620px) { .pm-kpis { grid-template-columns: repeat(2, 1fr); } }
.pm-kpi { background: var(--panel); border: 1px solid var(--line); border-top: 4px solid var(--ink);
  padding: 12px 14px; }
.pm-kpi__rotulo { font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
  color: var(--muted); font-weight: 600; }
.pm-kpi__valor { font-size: 22px; font-weight: 600; margin-top: 6px; }
.pm-kpi__nota { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* ── Painéis de síntese ─────────────────────────────────────────────────── */
.pm-sinteses { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
@media (max-width: 1100px) { .pm-sinteses { grid-template-columns: 1fr; } }
.pm-painel { background: var(--panel); border: 1px solid var(--line2); }
.pm-painel__topo { padding: 12px 16px 4px; }
.pm-painel__titulo { margin: 0; font-size: 17px; font-weight: 700; }
.pm-painel__sub { font-size: 11px; color: var(--muted); }
.pm-painel__corpo { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 10px; }
.pm-barra { height: 16px; background: var(--track); border: 1px solid var(--trackline); }
.pm-barra__preenche { height: 100%; transition: width .35s ease; }
.pm-legenda { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
.pm-legenda__nome { font-weight: 600; }
.pm-lucro-bico { display: grid; grid-template-columns: 96px 1fr 92px; align-items: center;
  gap: 8px; font-size: 12px; }
.pm-lucro-bico__nome { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-estoque-barra { position: relative; height: 16px; background: var(--track);
  border: 1px solid var(--trackline); }
.pm-estoque-barra__marca { position: absolute; top: 0; bottom: 0; width: 3px; background: var(--ink); }
.pm-estoque-barra__pes { display: flex; justify-content: space-between; font-size: 11px;
  color: var(--muted); margin-top: 2px; }

/* ── Seções (Venda / Compra / Estoque) ──────────────────────────────────── */
.pm-secao { background: var(--panel); border: 1px solid var(--line2); }
.pm-secao__faixa { padding: 10px 16px; display: flex; align-items: baseline; gap: 14px;
  border-bottom: 1px solid var(--line2); color: #141715; flex-wrap: wrap; }
.pm-secao__faixa h2 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: .01em; }
.pm-secao__formula { font-size: 12px; }
.pm-rolagem { overflow-x: auto; }

/* ── Tabelas ────────────────────────────────────────────────────────────── */
.pm-tabela { width: 100%; border-collapse: collapse; font-size: 14px; }
.pm-tabela th { background: var(--thead); text-align: right; padding: 8px 10px;
  border: 1px solid var(--line); font-size: 12px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--muted2); font-weight: 600; }
.pm-tabela th:first-child { text-align: left; width: 150px; }
.pm-tabela td { padding: 7px 10px; border: 1px solid var(--line); text-align: right; }
.pm-tabela td:first-child { text-align: left; font-weight: 600; font-size: 15px; }
.pm-tabela__num { font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
.pm-tabela__forte { font-weight: 600; }
.pm-tabela td.pm-tabela__campo { padding: 0; background: var(--panel); }
.pm-total td { font-weight: 700; color: #141715; padding: 8px 10px;
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
.pm-total td:first-child { font-family: inherit; }
.pm-total--venda td { background: var(--venda); border: 1px solid var(--venda-linha); }
.pm-total--compra td { background: var(--compra); border: 1px solid var(--compra-linha); }
.pm-total--estoque td { background: var(--estoque); border: 1px solid var(--estoque-linha); }

.pm-secao__faixa--venda { background: var(--venda); }
.pm-secao__faixa--venda .pm-secao__formula { color: var(--venda-tinta); }
.pm-secao__faixa--compra { background: var(--compra); }
.pm-secao__faixa--compra .pm-secao__formula { color: var(--compra-tinta); }
.pm-secao__faixa--custo { background: var(--custo); }
.pm-secao__faixa--custo h2 { font-size: 18px; }
.pm-secao__faixa--estoque { background: var(--estoque); }
.pm-secao__faixa--estoque .pm-secao__formula { color: var(--estoque-tinta); }

.pm-tabela--venda { min-width: 1280px; }
.pm-tabela--compra { min-width: 640px; }
.pm-tabela--estoque { min-width: 960px; }

/* Campo digitável: a planilha do dono também tem célula clara para digitar. */
.pm-campo { width: 100%; box-sizing: border-box; padding: 7px 10px; border: 0;
  background: transparent; text-align: right; font-size: 14px; color: var(--ink);
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
.pm-campo:focus { outline: 2px solid var(--ink); outline-offset: -2px; }

/* ── Estados: vazio, carregando, campo travado ──────────────────────────── */
.pm-campo::placeholder { color: var(--muted); opacity: .6; font-weight: 400; }
.pm-campo:disabled { color: var(--muted); cursor: not-allowed; }
.pm-vazio td { text-align: center; color: var(--muted); padding: 22px 10px; font-size: 13px;
  border: 1px solid var(--line); }
.pm-carregando { color: var(--muted); padding: 40px 0; text-align: center; font-size: 14px; }
.pm-tabela td.pm-tabela__texto { text-align: right; }
.pm-tabela__aviso { margin-left: 8px; font-size: 10px; text-transform: uppercase;
  letter-spacing: .08em; color: var(--muted); border: 1px solid var(--line2); padding: 1px 5px;
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
.pm-dupla { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; align-items: start; }
@media (max-width: 1100px) { .pm-dupla { grid-template-columns: 1fr; } }
.pm-custo__corpo { padding: 14px; display: flex; flex-direction: column; gap: 14px; }
.pm-custo__rotulo { font-size: 12px; letter-spacing: .1em; text-transform: uppercase;
  color: var(--muted); font-weight: 600; }
.pm-custo__caixa { display: flex; align-items: center; border: 1px solid var(--line);
  background: var(--panel); margin-top: 4px; }
.pm-custo__moeda { padding: 0 8px; color: var(--muted); }
.pm-custo__campo { flex: 1; min-width: 0; box-sizing: border-box; padding: 9px 10px; border: 0;
  background: transparent; text-align: right; font-size: 18px; font-weight: 600; color: var(--ink);
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
.pm-custo__campo:focus { outline: 2px solid var(--ink); outline-offset: -2px; }
.pm-custo__bloco { border-top: 1px dashed var(--line); padding-top: 12px; }
.pm-custo__valor { font-size: 26px; font-weight: 600; margin-top: 4px; }
.pm-custo__nota { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* ── Rodapé ─────────────────────────────────────────────────────────────── */
.pm-rodape { display: flex; justify-content: space-between; align-items: center; gap: 16px;
  font-size: 12px; color: var(--muted); flex-wrap: wrap; }
.pm-rodape__botao { font-size: 12px; padding: 7px 14px; background: var(--ink); color: var(--bg);
  border: 0; cursor: pointer; letter-spacing: .06em;
  font-family: 'IBM Plex Mono', 'JetBrains Mono', monospace; }
.pm-rodape__botao:hover:not(:disabled) { opacity: .8; }
.pm-rodape__botao:disabled { opacity: .35; cursor: default; }
.pm-rodape__botao--fantasma { background: transparent; color: var(--ink);
  border: 1px solid var(--line2); }
.pm-rodape__erro { color: var(--neg); font-weight: 600; }
.pm-aviso--erro { border-color: var(--neg);
  background: color-mix(in srgb, var(--neg) 14%, var(--panel)); }
`;
