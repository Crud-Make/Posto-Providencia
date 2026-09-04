/**
 * Aplica um arquivo de migration em produção pela API de management do Supabase.
 *
 * Uso:  bun scripts/aplica-migration.ts supabase/migrations/<arquivo>.sql
 *
 * @remarks
 * Caminho que as sessões anteriores usaram para carga e para RLS (memória
 * `zerado-28-08-carga-conferida-pendente`): a API aceita o SQL inteiro, com
 * `BEGIN`/`COMMIT`, e o `User-Agent` é obrigatório (o WAF devolve 403 sem ele).
 * Token em `.claude/settings.local.json` → `env.SUPABASE_ACCESS_TOKEN`; ref do
 * projeto em `.mcp.json`. Nada vai para a linha de comando nem para o log.
 *
 * Só aplica o que está versionado em `supabase/migrations/` — o §5 do CLAUDE.md
 * (migração é arquivo, nunca clique no painel) vale também para o atalho.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const arquivo = process.argv[2];
if (!arquivo || !arquivo.startsWith('supabase/migrations/') || !arquivo.endsWith('.sql')) {
    console.error('Uso: bun scripts/aplica-migration.ts supabase/migrations/<arquivo>.sql');
    process.exit(1);
}

const raiz = resolve(import.meta.dir, '..');
const settings = JSON.parse(readFileSync(resolve(raiz, '.claude/settings.local.json'), 'utf8')) as {
    env?: { SUPABASE_ACCESS_TOKEN?: string };
};
const token = settings.env?.SUPABASE_ACCESS_TOKEN;
if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN ausente em .claude/settings.local.json → env.');
    process.exit(1);
}

const mcp = readFileSync(resolve(raiz, '.mcp.json'), 'utf8');
const ref = mcp.match(/project-ref=([a-z0-9]+)/)?.[1];
if (!ref) {
    console.error('project-ref não encontrado em .mcp.json.');
    process.exit(1);
}

const sql = readFileSync(resolve(raiz, arquivo), 'utf8');
console.log(`Aplicando ${arquivo} (${sql.length} bytes) no projeto ${ref}…`);

const resposta = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'posto-providencia-migracao/1.0',
    },
    body: JSON.stringify({ query: sql }),
});

const corpo = await resposta.text();
if (!resposta.ok) {
    console.error(`HTTP ${resposta.status}: ${corpo.slice(0, 800)}`);
    process.exit(1);
}
console.log(`HTTP ${resposta.status} — aplicada. Resposta: ${corpo.slice(0, 200) || '(vazia)'}`);
