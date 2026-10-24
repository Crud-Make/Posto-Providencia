#!/usr/bin/env node
// Catraca de dívida: regra nova entra ligada, o erro que já existe fica congelado, e só
// o erro NOVO reprova. A lista congelada só pode diminuir.
//
//   node scripts/catraca.mjs tsc                     compara o tsc inteiro com .catraca/tsc.json
//   node scripts/catraca.mjs eslint [arquivos…]      idem com .catraca/eslint.json (sem arquivos = apps packages)
//   node scripts/catraca.mjs <tsc|eslint> --atualizar   regrava a lista, SÓ PARA BAIXO
//   … --atualizar --aceitar-divida                      regrava deixando subir (decisão do dono, dizer no PR)
//   node scripts/catraca.mjs verificar-base <ref>     .catraca/*.json da árvore contra os da ref (CI):
//                                                     chave que subiu ou apareceu reprova, salvo ACEITA_DIVIDA=1
//
// Por que por (arquivo, regra) e não por linha: linha muda a cada edição acima dela. A
// contagem por arquivo e regra aguenta a edição, e o arquivo que ganhou um erro a mais
// da mesma regra reprova — o custo é não distinguir "consertei um e criei outro" no
// mesmo arquivo, que é raro e sai empatado.
//
// Regras de MEDIDA (19/09/2026): para complexity, max-lines e max-lines-per-function a
// contagem não basta — uma função congelada em CCN 27 podia ir a 40 e passar verde, porque
// continuava sendo "1 erro" da mesma regra no mesmo arquivo. Para essas regras a lista
// guarda os VALORES medidos, em ordem decrescente: `"arquivo|complexity": [27, 14]`. Reprova
// quando a lista cresce (função nova acima do teto) ou quando algum valor passa do congelado
// na mesma posição (a função que já era dívida cresceu). Número simples continua valendo
// para as demais regras — o formato antigo de .catraca/*.json não muda.
//
// Por que existe (18/09/2026): as flags estritas do tsconfig abriram ~365 erros, e
// strict-boolean-expressions + no-floating-promises mais ~500. Corrigir tudo num PR toca
// fórmula de dinheiro sem golden por arquivo. Deixar desligado é deixar o código novo
// nascer com a mesma dívida.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(RAIZ, 'node_modules', '.bin');
const DIR_CATRACA = path.join(RAIZ, '.catraca');
const FERRAMENTAS = ['tsc', 'eslint'];

/** @typedef {{ arquivo: string, linha: number, regra: string, mensagem: string }} Violacao */
/** @typedef {Record<string, number | number[]>} Contagem  número = quantidade; lista = valores medidos, decrescente */

/** Roda um comando que sai com código != 0 quando acha erro, e devolve o stdout mesmo assim. */
function rodar(bin, args) {
  try {
    return execFileSync(bin, args, { cwd: RAIZ, encoding: 'utf-8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (erro) {
    if (typeof erro.stdout === 'string' && erro.stdout !== '') return erro.stdout;
    throw erro;
  }
}

const relativo = (p) => path.relative(RAIZ, path.resolve(RAIZ, p)).split(path.sep).join('/');

/** @returns {Violacao[]} */
export function parseTsc(saida) {
  const linha = /^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/;
  // Erro de config (`error TS5023: …`) não tem arquivo. Sem esta linha ele seria lido como
  // "zero erros" e a catraca passaria verde com o tsc quebrado.
  const semArquivo = /^error (TS\d+): (.*)$/;
  return saida.split('\n').flatMap((l) => {
    const m = linha.exec(l);
    if (m) return [{ arquivo: relativo(m[1]), linha: Number(m[2]), regra: m[3], mensagem: m[4] }];
    const s = semArquivo.exec(l);
    return s ? [{ arquivo: '<config>', linha: 0, regra: s[1], mensagem: s[2] }] : [];
  });
}

/** @returns {Violacao[]} */
export function parseEslint(saida) {
  /** @type {Array<{ filePath: string, messages: Array<{ ruleId: string | null, line: number, message: string, severity: number }> }>} */
  const resultados = JSON.parse(saida);
  return resultados.flatMap((r) =>
    r.messages
      .filter((m) => m.severity === 2)
      // ruleId nulo = erro de parse/config. Entra como regra própria para nunca ser congelado em silêncio.
      .map((m) => ({ arquivo: relativo(r.filePath), linha: m.line, regra: m.ruleId ?? 'eslint/erro-fatal', mensagem: m.message })),
  );
}

/**
 * Regras cuja mensagem carrega um valor medido. Para elas a catraca congela o VALOR, não
 * só a quantidade — ver o cabeçalho.
 */
export const MEDIDAS = new Set(['complexity', 'max-lines', 'max-lines-per-function']);

/**
 * Extrai o valor medido da mensagem do ESLint 9.39.2:
 *   complexity              "… has a complexity of 27. Maximum allowed is 10."
 *   max-lines               "File has too many lines (345). Maximum allowed is 300."
 *   max-lines-per-function  "… has too many lines (74). Maximum allowed is 60."
 * Devolve null para regra que não é medida ou mensagem em formato desconhecido.
 * @returns {number | null}
 */
export function parseMedida(regra, mensagem) {
  if (!MEDIDAS.has(regra)) return null;
  const m = regra === 'complexity' ? /complexity of (\d+)/.exec(mensagem) : /too many lines \((\d+)\)/.exec(mensagem);
  return m ? Number(m[1]) : null;
}

const chave = (v) => `${v.arquivo}|${v.regra}`;

/** @param {Violacao[]} violacoes @returns {Contagem} */
export function contar(violacoes) {
  /** @type {Record<string, number | number[]>} */
  const contagem = {};
  for (const v of violacoes) {
    const k = chave(v);
    if (!MEDIDAS.has(v.regra)) {
      contagem[k] = (contagem[k] ?? 0) + 1;
      continue;
    }
    const medida = parseMedida(v.regra, v.mensagem);
    // Mensagem sem número = o ESLint mudou o texto. Falhar alto: congelar "0" aqui deixaria a
    // regra passar verde para sempre.
    if (medida === null) throw new Error(`[catraca] ${k}: mensagem da regra de medida sem valor numérico: "${v.mensagem}". Atualize parseMedida.`);
    const lista = Array.isArray(contagem[k]) ? contagem[k] : [];
    lista.push(medida);
    contagem[k] = lista;
  }
  for (const k of Object.keys(contagem)) {
    if (Array.isArray(contagem[k])) contagem[k].sort((a, b) => b - a);
  }
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

const regraDaChave = (k) => k.slice(k.indexOf('|') + 1);
const arquivoDaChave = (k) => k.slice(0, k.indexOf('|'));

/**
 * Lê o valor congelado de uma chave no formato que a comparação exige, olhando também o formato
 * do lado de "agora" (`agora` = número ou lista, ou undefined quando a chave sumiu):
 *   • regra de medida, congelado em lista → a lista (compara valor a valor);
 *   • regra de medida, agora em lista e congelado em número → [] : formato antigo, sem valores;
 *     nada está congelado com valor, e a lista atual inteira conta como nova até alguém regravar;
 *   • regra de medida, agora em número (ou ausente) → o número congelado: formato antigo dos DOIS
 *     lados, compara quantidade. É o caso do `verificar-base` entre duas listas anteriores à catraca
 *     de medida — igual dos dois lados não pode reprovar (falso vermelho achado em 19/09);
 *   • regra sem medida → número (lista, se houver, vale pela quantidade).
 */
function congeladoDe(congelado, k, agora) {
  const valor = congelado[k];
  if (MEDIDAS.has(regraDaChave(k))) {
    if (Array.isArray(valor)) return valor;
    return Array.isArray(agora) ? [] : (valor ?? 0);
  }
  if (Array.isArray(valor)) return valor.length;
  return valor ?? 0;
}

/**
 * Lista atual (decrescente) cabe na congelada (decrescente)? Só cabe se não é mais longa e
 * cada posição não passou da congelada — o que equivale a existir um encaixe de cada função
 * de hoje numa vaga congelada de valor igual ou maior.
 */
function listaSubiu(agora, congelado) {
  return agora.length > congelado.length || agora.some((n, i) => n > congelado[i]);
}

/**
 * "Agora" passou do congelado? Lista contra lista compara valor a valor; número contra número,
 * quantidade. Número de "agora" contra LISTA congelada é regressão de formato — a lista com
 * valores virou contagem à mão e o valor congelado se perdeu — e conta como subida.
 */
function subiu(agora, congelado) {
  if (Array.isArray(agora) && Array.isArray(congelado)) return listaSubiu(agora, congelado);
  if (Array.isArray(congelado)) return true;
  return (Array.isArray(agora) ? agora.length : agora) > congelado;
}
const iguais = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Compara duas contagens. Núcleo de `comparar` (lint da árvore) e de `verificar-base` (CI).
 * @param {Contagem} agora
 * @param {Contagem} congelado
 * @param {(arquivo: string) => boolean} noEscopo  só as chaves destes arquivos contam (lint parcial)
 */
export function compararContagens(agora, congelado, noEscopo = () => true) {
  const novas = [];
  const baixaram = [];
  for (const [k, n] of Object.entries(agora)) {
    const antes = congeladoDe(congelado, k, n);
    if (subiu(n, antes)) novas.push({ chave: k, antes, agora: n });
  }
  const chavesNovas = new Set(novas.map((n) => n.chave));
  for (const k of Object.keys(congelado)) {
    if (!noEscopo(arquivoDaChave(k)) || chavesNovas.has(k)) continue;
    const antes = congeladoDe(congelado, k, agora[k]);
    const depois = agora[k] ?? (Array.isArray(antes) ? [] : 0);
    if (!iguais(antes, depois)) baixaram.push({ chave: k, antes, agora: depois });
  }
  return { novas, baixaram };
}

/**
 * Compara o que existe agora com a lista congelada.
 * @param {Violacao[]} atuais
 * @param {Contagem} congelado
 * @param {(arquivo: string) => boolean} noEscopo  só as chaves destes arquivos contam (lint parcial)
 */
export function comparar(atuais, congelado, noEscopo = () => true) {
  const { novas, baixaram } = compararContagens(contar(atuais), congelado, noEscopo);
  const chavesNovas = new Set(novas.map((n) => n.chave));
  return { novas, detalhe: atuais.filter((v) => chavesNovas.has(chave(v))), baixaram };
}

/**
 * Argumentos do ESLint na catraca. `--no-inline-config` é a trava contra `eslint-disable`:
 * sem ele, um comentário no arquivo apagava o erro antes de a catraca contá-lo, e qualquer
 * regra passava (achado da revisão do PR #119, 18/09). Com ele, o erro suprimido aparece e
 * conta como qualquer outro — o que já existia foi congelado na lista, o novo reprova.
 * Exportado para o canário testar exatamente estes argumentos.
 */
export const ARGS_ESLINT = ['--format', 'json', '--no-warn-ignored', '--no-inline-config'];

/** Roda a ferramenta de verdade e devolve as violações. Exportado para o canário de Q-1..Q-3 rodar
 *  o ESLint real contra um arquivo gerado, trocando só a lista congelada (travas.test.ts). */
export function coletar(ferramenta, arquivos) {
  if (ferramenta === 'tsc') return parseTsc(rodar(path.join(BIN, 'tsc'), ['--noEmit', '--pretty', 'false']));
  const alvos = arquivos.length > 0 ? arquivos : ['apps', 'packages'];
  return parseEslint(rodar(path.join(BIN, 'eslint'), [...ARGS_ESLINT, ...alvos]));
}

/** Leitor de `<dir>/<ferramenta>.json`; arquivo ausente = nada congelado. Exportado para o canário. */
export const lerDir = (dir) => (ferramenta) => {
  const arquivo = path.join(dir, `${ferramenta}.json`);
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf-8')) : {};
};

function gravar(ferramenta, contagem) {
  mkdirSync(DIR_CATRACA, { recursive: true });
  writeFileSync(path.join(DIR_CATRACA, `${ferramenta}.json`), `${JSON.stringify(contagem, null, 2)}\n`);
}

/**
 * `.catraca/<ferramenta>.json` como está na ref (git show). Fail-closed nos dois caminhos de erro:
 * devolve `{}` (nada congelado lá), e toda chave da árvore conta como nova. Mas a MENSAGEM distingue
 * (revisão de 19/09): "ref inválida" — typo, ou checkout raso em que a base não foi buscada — de
 * "a ref existe e não tem a lista" — base anterior à catraca. Antes as duas saíam mudas e iguais,
 * e um CI vermelho por fetch errado parecia dívida nova.
 */
export function lerDaRef(ref, erro = console.error) {
  const git = (args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  return (ferramenta) => {
    try {
      git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    } catch {
      erro(`[catraca] ref inválida: "${ref}" não é um commit deste repositório (checkout raso sem a base?). Nada congelado lá — toda chave da árvore conta como nova.`);
      return {};
    }
    try {
      return JSON.parse(git(['show', `${ref}:./.catraca/${ferramenta}.json`]));
    } catch {
      erro(`[catraca] ${ref} existe, mas não tem .catraca/${ferramenta}.json legível — nada congelado lá.`);
      return {};
    }
  };
}

const fmt = (v) => (Array.isArray(v) ? `[${v.join(', ')}]` : String(v));

/** Dependências injetáveis, para o canário prender as recusas sem rodar tsc/eslint/git. */
const DEPS = { coletar, ler: lerDir(DIR_CATRACA), gravar, lerDaRef, log: console.log, erro: console.error, env: process.env };

/**
 * `verificar-base <ref>`: a lista da árvore contra a lista da ref. Chave que subiu ou apareceu
 * reprova — é o buraco "alguém sobe o número à mão" que o lint não vê, porque o lint só
 * confere a árvore contra a própria lista. `ACEITA_DIVIDA=1` (rótulo do PR) libera.
 * @returns {number} código de saída
 */
export function verificarBase(lerAtual, lerBase, { aceitaDivida = false, log = console.log, erro = console.error } = {}) {
  let subidas = 0;
  for (const ferramenta of FERRAMENTAS) {
    const { novas } = compararContagens(lerAtual(ferramenta), lerBase(ferramenta));
    for (const n of novas) erro(`  [${ferramenta}] ${n.chave}: base ${fmt(n.antes)} → árvore ${fmt(n.agora)}`);
    subidas += novas.length;
  }
  if (subidas === 0) {
    log('[catraca verificar-base] ✓ .catraca/*.json não subiu em relação à base.');
    return 0;
  }
  if (aceitaDivida) {
    log(`[catraca verificar-base] ${subidas} subida(s) ACEITA(S) por decisão do dono (ACEITA_DIVIDA=1).`);
    return 0;
  }
  erro(`[catraca verificar-base] ✗ ${subidas} chave(s) subiram ou apareceram em .catraca/ em relação à base. A lista só desce.`);
  erro('  Se é decisão consciente do dono, ponha o rótulo aceita-divida no PR e diga por quê.');
  return 1;
}

function atualizar(ferramenta, atuais, novas, aceitarDivida, deps) {
  if (novas.length > 0 && !aceitarDivida) {
    deps.erro(`[catraca ${ferramenta}] RECUSADO: --atualizar congelaria ${novas.length} dívida(s) nova(s). A lista só desce.`);
    for (const n of novas) deps.erro(`  ${n.chave}: ${fmt(n.antes)} → ${fmt(n.agora)}`);
    deps.erro('  Se é decisão consciente do dono, repita com --aceitar-divida e diga no PR por quê.');
    return 1;
  }
  deps.gravar(ferramenta, contar(atuais));
  deps.log(`[catraca ${ferramenta}] lista regravada: ${atuais.length} erro(s) congelado(s).`);
  return 0;
}

/**
 * Corpo do comando, com as dependências injetáveis (o canário prende as recusas por aqui).
 * @returns {number} código de saída
 */
export function main(argv, deps = DEPS) {
  const [ferramenta, ...resto] = argv;
  if (ferramenta === 'verificar-base') {
    const ref = resto[0];
    if (ref === undefined) {
      deps.erro('uso: catraca.mjs verificar-base <ref>');
      return 2;
    }
    return verificarBase(deps.ler, deps.lerDaRef(ref, deps.erro), { aceitaDivida: deps.env.ACEITA_DIVIDA === '1', log: deps.log, erro: deps.erro });
  }
  if (!FERRAMENTAS.includes(ferramenta)) {
    deps.erro('uso: catraca.mjs <tsc|eslint> [--atualizar [--aceitar-divida]] [arquivos…] | verificar-base <ref>');
    return 2;
  }
  const atualizando = resto.includes('--atualizar');
  const aceitarDivida = resto.includes('--aceitar-divida');
  const arquivos = resto.filter((a) => !a.startsWith('--')).map(relativo);
  if (atualizando && arquivos.length > 0) {
    deps.erro('[catraca] --atualizar só com a varredura inteira: lista parcial apagaria a dívida dos outros arquivos.');
    return 2;
  }

  const congelado = deps.ler(ferramenta);
  const atuais = deps.coletar(ferramenta, arquivos);
  const noEscopo = arquivos.length > 0 ? (a) => arquivos.includes(a) : () => true;
  const { novas, detalhe, baixaram } = comparar(atuais, congelado, noEscopo);

  if (atualizando) return atualizar(ferramenta, atuais, novas, aceitarDivida, deps);

  const total = atuais.filter((v) => noEscopo(v.arquivo)).length;
  if (novas.length > 0) {
    deps.erro(`[catraca ${ferramenta}] ✗ ERRO NOVO — a dívida congelada não pode crescer.`);
    for (const v of detalhe) deps.erro(`  ${v.arquivo}:${v.linha}  ${v.regra}  ${v.mensagem}`);
    deps.erro('');
    for (const n of novas) deps.erro(`  ${n.chave}: congelado ${fmt(n.antes)}, agora ${fmt(n.agora)}`);
    return 1;
  }
  if (baixaram.length > 0) {
    deps.log(`[catraca ${ferramenta}] dívida baixou em ${baixaram.length} ponto(s) — rode \`bun run catraca:atualizar\` e commite .catraca/.`);
  }
  deps.log(`[catraca ${ferramenta}] ✓ nenhum erro novo (${total} congelado(s) no escopo).`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
