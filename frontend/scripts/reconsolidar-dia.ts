/**
 * Reconsolida o `Fechamento` pai de um ou mais dias — para dado que entrou por SQL.
 *
 * Uso:  bun scripts/reconsolidar-dia.ts 2026-08-28 2026-08-29
 *       bun scripts/reconsolidar-dia.ts 2026-08-01..2026-08-31
 *
 * @remarks
 * A carga histórica insere `Leitura` e `FechamentoFrentista` direto no banco, e
 * nada no banco recalcula o pai (não há trigger — decisão: a fórmula de dinheiro
 * mora em `@posto/utils`, e uma cópia em SQL ficaria sem golden). Este script é a
 * porta de reconsolidação para esse caminho: a MESMA `consolidarFechamento` que o
 * PWA e o painel usam, sobre a mesma conta canônica.
 *
 * Roda como `anon` (chaves do `.env.local`), portanto respeita a RLS: só reconsolida
 * dia dentro da janela de edição (`dentro_da_janela_de_edicao`, mês anterior em
 * diante). Dia mais antigo devolve "falhou" — e isso é o comportamento certo, não
 * um bug do script.
 *
 * Nunca insere nem apaga nada: só o `update` de totais que a consolidação já faz.
 */
import { createClient } from '@supabase/supabase-js';
import { criarAcessoEncerrante } from '@posto/api-core';
import { somarDias, deIsoLocal } from '@posto/utils';

const POSTO_ID = 1;

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
    console.error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no ambiente (.env.local).');
    process.exit(1);
}

/** Expande `a..b` em dias e deixa `aaaa-mm-dd` solto passar. */
function diasDe(args: readonly string[]): string[] {
    const dias: string[] = [];
    for (const a of args) {
        const faixa = a.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
        if (faixa) {
            for (let d = faixa[1]; d <= faixa[2]; d = somarDias(deIsoLocal(d), 1)) dias.push(d);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(a)) {
            dias.push(a);
        } else {
            console.error(`Argumento inválido: ${a} (use aaaa-mm-dd ou aaaa-mm-dd..aaaa-mm-dd)`);
            process.exit(1);
        }
    }
    return dias;
}

const dias = diasDe(process.argv.slice(2));
if (dias.length === 0) {
    console.error('Informe pelo menos um dia.');
    process.exit(1);
}

const supabase = createClient(url, anon);
const acesso = criarAcessoEncerrante(supabase);
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

for (const dia of dias) {
    const { data: pai, error } = await supabase
        .from('Fechamento')
        .select('id')
        .eq('posto_id', POSTO_ID)
        .eq('data', dia)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.log(`${dia}  erro ao buscar o pai: ${error.message}`);
        continue;
    }
    if (!pai) {
        console.log(`${dia}  sem pai — nenhum frentista abriu o dia`);
        continue;
    }

    const r = await acesso.consolidarFechamento(pai.id);
    if (!r) {
        console.log(`${dia}  falhou (fora da janela de edição? veja o erro acima)`);
    } else if (!r.apurado) {
        console.log(`${dia}  não apurado — faltam bicos no encerrante; recebido ${reais(r.totalRecebido)}`);
    } else {
        const rotulo = r.diferenca === 0 ? 'bateu' : r.diferenca > 0 ? `FALTA ${reais(r.diferenca)}` : `SOBRA ${reais(-r.diferenca)}`;
        console.log(`${dia}  apurado — venda ${reais(r.totalVendas)} · recebido ${reais(r.totalRecebido)} · ${rotulo}`);
    }
}
