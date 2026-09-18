#!/usr/bin/env node
// Catraca de dívida: regra nova entra ligada, o erro que já existe fica congelado, e só
// o erro NOVO reprova. A lista congelada só pode diminuir.
//
//   node scripts/catraca.mjs tsc                     compara o tsc inteiro com .catraca/tsc.json
//   node scripts/catraca.mjs eslint [arquivos…]      idem com .catraca/eslint.json (sem arquivos = apps packages)
//   node scripts/catraca.mjs <tsc|eslint> --atualizar   regrava a lista, SÓ PARA BAIXO
//   … --atualizar --aceitar-divida                      regrava deixando subir (decisão do dono, dizer no PR)
//
// Por que por (arquivo, regra) e não por linha: linha muda a cada edição acima dela. A
// contagem por arquivo e regra aguenta a edição, e o arquivo que ganhou um erro a mais
// da mesma regra reprova — o custo é não distinguir "consertei um e criei outro" no
// mesmo arquivo, que é raro e sai empatado.
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

/** @typedef {{ arquivo: string, linha: number, regra: string, mensagem: string }} Violacao */

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

const chave = (v) => `${v.arquivo}|${v.regra}`;

/** @param {Violacao[]} violacoes @returns {Record<string, number>} */
export function contar(violacoes) {
  /** @type {Record<string, number>} */
  const contagem = {};
  for (const v of violacoes) contagem[chave(v)] = (contagem[chave(v)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(contagem).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * Compara o que existe agora com a lista congelada.
 * @param {Violacao[]} atuais
 * @param {Record<string, number>} congelado
 * @param {(arquivo: string) => boolean} noEscopo  só as chaves destes arquivos contam (lint parcial)
 */
export function comparar(atuais, congelado, noEscopo = () => true) {
  const agora = contar(atuais);
  const novas = Object.entries(agora).filter(([k, n]) => n > (congelado[k] ?? 0));
  const baixaram = Object.entries(congelado).filter(([k, n]) => noEscopo(k.split('|')[0]) && (agora[k] ?? 0) < n);
  const chavesNovas = new Set(novas.map(([k]) => k));
  return {
    novas: novas.map(([k, n]) => ({ chave: k, antes: congelado[k] ?? 0, agora: n })),
    detalhe: atuais.filter((v) => chavesNovas.has(chave(v))),
    baixaram: baixaram.map(([k, n]) => ({ chave: k, antes: n, agora: agora[k] ?? 0 })),
  };
}

/**
 * Argumentos do ESLint na catraca. `--no-inline-config` é a trava contra `eslint-disable`:
 * sem ele, um comentário no arquivo apagava o erro antes de a catraca contá-lo, e qualquer
 * regra passava (achado da revisão do PR #119, 18/09). Com ele, o erro suprimido aparece e
 * conta como qualquer outro — o que já existia foi congelado na lista, o novo reprova.
 * Exportado para o canário testar exatamente estes argumentos.
 */
export const ARGS_ESLINT = ['--format', 'json', '--no-warn-ignored', '--no-inline-config'];

function coletar(ferramenta, arquivos) {
  if (ferramenta === 'tsc') return parseTsc(rodar(path.join(BIN, 'tsc'), ['--noEmit', '--pretty', 'false']));
  const alvos = arquivos.length > 0 ? arquivos : ['apps', 'packages'];
  return parseEslint(rodar(path.join(BIN, 'eslint'), [...ARGS_ESLINT, ...alvos]));
}

function ler(ferramenta) {
  const arquivo = path.join(DIR_CATRACA, `${ferramenta}.json`);
  return existsSync(arquivo) ? JSON.parse(readFileSync(arquivo, 'utf-8')) : {};
}

function gravar(ferramenta, contagem) {
  mkdirSync(DIR_CATRACA, { recursive: true });
  writeFileSync(path.join(DIR_CATRACA, `${ferramenta}.json`), `${JSON.stringify(contagem, null, 2)}\n`);
}

function main(argv) {
  const [ferramenta, ...resto] = argv;
  if (ferramenta !== 'tsc' && ferramenta !== 'eslint') {
    console.error('uso: catraca.mjs <tsc|eslint> [--atualizar [--aceitar-divida]] [arquivos…]');
    return 2;
  }
  const atualizar = resto.includes('--atualizar');
  const aceitarDivida = resto.includes('--aceitar-divida');
  const arquivos = resto.filter((a) => !a.startsWith('--')).map(relativo);
  if (atualizar && arquivos.length > 0) {
    console.error('[catraca] --atualizar só com a varredura inteira: lista parcial apagaria a dívida dos outros arquivos.');
    return 2;
  }

  const congelado = ler(ferramenta);
  const atuais = coletar(ferramenta, arquivos);
  const noEscopo = arquivos.length > 0 ? (a) => arquivos.includes(a) : () => true;
  const { novas, detalhe, baixaram } = comparar(atuais, congelado, noEscopo);

  if (atualizar) {
    if (novas.length > 0 && !aceitarDivida) {
      console.error(`[catraca ${ferramenta}] RECUSADO: --atualizar congelaria ${novas.length} dívida(s) nova(s). A lista só desce.`);
      for (const n of novas) console.error(`  ${n.chave}: ${n.antes} → ${n.agora}`);
      console.error('  Se é decisão consciente do dono, repita com --aceitar-divida e diga no PR por quê.');
      return 1;
    }
    gravar(ferramenta, contar(atuais));
    console.log(`[catraca ${ferramenta}] lista regravada: ${atuais.length} erro(s) congelado(s).`);
    return 0;
  }

  const total = atuais.filter((v) => noEscopo(v.arquivo)).length;
  if (novas.length > 0) {
    console.error(`[catraca ${ferramenta}] ✗ ERRO NOVO — a dívida congelada não pode crescer.`);
    for (const v of detalhe) console.error(`  ${v.arquivo}:${v.linha}  ${v.regra}  ${v.mensagem}`);
    console.error('');
    for (const n of novas) console.error(`  ${n.chave}: congelado ${n.antes}, agora ${n.agora}`);
    return 1;
  }
  if (baixaram.length > 0) {
    console.log(`[catraca ${ferramenta}] dívida baixou em ${baixaram.length} ponto(s) — rode \`bun run catraca:atualizar\` e commite .catraca/.`);
  }
  console.log(`[catraca ${ferramenta}] ✓ nenhum erro novo (${total} congelado(s) no escopo).`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
