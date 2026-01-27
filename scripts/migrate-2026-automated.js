
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const NOZZLE_MAP = {
    'G,C. Bico 01': 7, 'G,A.Bico 02': 8, 'Etanol,Bico 03': 9,
    'DS:.10,Bico 04': 10, 'G,C, Bico 05': 11, 'G,C. Bico 06': 12
};
const FUEL_MAP = { 7: 1, 8: 2, 9: 3, 10: 4, 11: 1, 12: 1 };
const PRICE_MAP = { 1: 6.48, 2: 6.48, 3: 4.98, 4: 6.38 };
const PAGAMENTO_ID = { DINHEIRO: 1, PIX: 2, CREDITO: 3, DEBITO: 4 };

async function getOrCreateFrentista(name) {
    if (!name || name.trim() === '' || name.includes('Caixa') || name.includes('%')) return null;
    const cleanName = name.trim();

    const { data: existing } = await supabase.from('Frentista').select('id').ilike('nome', cleanName).single();
    if (existing) return existing.id;

    const { data: newF } = await supabase.from('Frentista').insert({ nome: cleanName }).select().single();
    return newF?.id;
}

async function migrateMonth(monthName, year = 2026) {
    console.log(`\n📂 Iniciando Migração: ${monthName} / ${year}`);
    const monthNum = monthName.match(/(\d+)/)?.[1] || '01';

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[monthName];
        if (!sheet) { console.log(`Aba ${monthName} não encontrada.`); return; }
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const blocks = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row && row.some(cell => typeof cell === 'string' && cell.includes('Caixa Dia'))) {
                const cellVal = row.find(cell => typeof cell === 'string' && cell.includes('Caixa Dia'));
                const match = cellVal.match(/Dia\s+(\d+)\s+Posto/);
                if (match) blocks.push({ day: parseInt(match[1]), startLine: i });
            }
        }
        console.log(`📊 Encontrados ${blocks.length} blocos diários.`);

        for (const block of blocks) {
            const dateStr = `${year}-${monthNum.padStart(2, '0')}-${block.day.toString().padStart(2, '0')}`;
            process.stdout.write(`\n📅 ${dateStr}: `);

            const nextBlockStart = blocks.find(b => b.startLine > block.startLine)?.startLine || data.length;
            const searchRange = data.slice(block.startLine, Math.min(block.startLine + 40, nextBlockStart));

            // 1. Detectar colunas
            let labelCol = -1;
            let frentistaStartCol = -1;
            let totalCol = -1;

            // Procurar linha de frentistas para definir colunas
            let frentistaNames = [];
            let frentistaIdx = -1;
            for (let i = 0; i < searchRange.length; i++) {
                if (String(searchRange[i][1] || '').includes('Venda Frentista') || String(searchRange[i][2] || '').includes('Venda Frentista')) {
                    frentistaIdx = i + 1;
                    const row = searchRange[frentistaIdx];
                    // Label col é o que tem 'Filip' ou similar em Jan, ou o que está ANTES
                    // Em Jan, row[2] é null, row[3] é Filip. Label column is 2.
                    // Em Feb, row[1] é null, row[2] é Leandro. Label column is 1.
                    for (let c = 0; c < row.length; c++) {
                        if (row[c] && !String(row[c]).includes('%') && !String(row[c]).includes('Caixa')) {
                            if (frentistaStartCol === -1) frentistaStartCol = c;
                            frentistaNames.push({ name: String(row[c]), col: c });
                        }
                        if (String(row[c]).includes('Caixa')) totalCol = c;
                    }
                    labelCol = frentistaStartCol - 1;
                    break;
                }
            }

            if (labelCol === -1) {
                // Fallback para Jan layout
                labelCol = 2; frentistaStartCol = 3; totalCol = 12;
            }

            // 2. Verificar se o dia tem dados (checar se há vendas de frentistas)
            const hasData = frentistaNames.some(f => {
                const testRow = searchRange.find(r => String(r[labelCol] || '').toLowerCase().includes('pix'));
                return testRow && parseFloat(testRow[f.col]) > 0;
            });

            if (!hasData) {
                process.stdout.write('VAZIO');
                continue;
            }

            // 3. Mapear linhas
            const lineMap = { nozzles: {} };
            searchRange.forEach((row, idx) => {
                const label = String(row[labelCol] || '').trim();
                const cleanLabel = label.toLowerCase();
                if (cleanLabel === 'pix') lineMap.pix = idx;
                if (cleanLabel.includes('cartao credito') || cleanLabel.includes('cartão crédito')) lineMap.credito = idx;
                if (cleanLabel.includes('cartao debito') || cleanLabel.includes('cartão débito')) lineMap.debito = idx;
                if (cleanLabel === 'notas') lineMap.notas = idx;
                if (cleanLabel === 'moeda') lineMap.moeda = idx;
                if (cleanLabel === 'baratao' || cleanLabel === 'baratão') lineMap.baratao = idx;
                if (cleanLabel === 'dinheiro') lineMap.dinheiro = idx;
                if (cleanLabel.includes('venda frentista')) lineMap.totalRecebido = idx;
                if (cleanLabel.includes('venda concentrador')) lineMap.totalVendas = idx;

                for (const key in NOZZLE_MAP) {
                    if (label === key) lineMap.nozzles[key] = idx;
                }
            });

            // 3. Totais
            const vIdx = lineMap.totalVendas !== undefined ? lineMap.totalVendas : 29;
            const rIdx = lineMap.totalRecebido !== undefined ? lineMap.totalRecebido : 28;
            const totalVendas = parseFloat(searchRange[vIdx]?.[totalCol]) || 0;
            const totalRecebido = parseFloat(searchRange[rIdx]?.[totalCol]) || 0;

            // 4. Upsert Fechamento
            const { data: fechamentoRes } = await supabase.from('Fechamento').select('id').eq('data', dateStr).eq('turno_id', 1).single();
            let fechamentoId;
            const fechData = {
                posto_id: 1, data: dateStr, turno_id: 1,
                total_vendas: totalVendas, total_recebido: totalRecebido,
                diferenca: totalRecebido - totalVendas, status: 'FECHADO', usuario_id: 1
            };
            if (fechamentoRes) {
                fechamentoId = fechamentoRes.id;
                await supabase.from('Fechamento').update(fechData).eq('id', fechamentoId);
            } else {
                const { data: newFech } = await supabase.from('Fechamento').insert(fechData).select().single();
                fechamentoId = newFech?.id;
            }
            if (!fechamentoId) { console.error('F'); continue; }

            // 5. Leituras
            await supabase.from('Leitura').delete().eq('data', dateStr);
            const readings = [];
            for (const bicoName in lineMap.nozzles) {
                const idx = lineMap.nozzles[bicoName];
                const row = searchRange[idx];
                const bicoId = NOZZLE_MAP[bicoName];
                const combustivelId = FUEL_MAP[bicoId];
                const preco = PRICE_MAP[combustivelId] || parseFloat(row[labelCol + 4]) || 0;
                readings.push({
                    posto_id: 1, bico_id: bicoId, combustivel_id: combustivelId, data: dateStr,
                    leitura_inicial: parseFloat(row[labelCol + 1]) || 0,
                    leitura_final: parseFloat(row[labelCol + 2]) || 0,
                    litros_vendidos: parseFloat(row[labelCol + 3]) || 0,
                    preco_litro: preco, valor_total: (parseFloat(row[labelCol + 3]) || 0) * preco,
                    turno_id: 1, usuario_id: 1
                });
            }
            if (readings.length > 0) await supabase.from('Leitura').insert(readings);

            // 6. Frentistas
            await supabase.from('FechamentoFrentista').delete().eq('fechamento_id', fechamentoId);
            let dailyPix = 0, dailyCredito = 0, dailyDebito = 0, dailyDinheiro = 0;

            for (const f of frentistaNames) {
                const frentistaId = await getOrCreateFrentista(f.name);
                if (!frentistaId) continue;
                const col = f.col;

                const pix = lineMap.pix !== undefined ? parseFloat(searchRange[lineMap.pix][col]) || 0 : 0;
                const credito = lineMap.credito !== undefined ? parseFloat(searchRange[lineMap.credito][col]) || 0 : 0;
                const debito = lineMap.debito !== undefined ? parseFloat(searchRange[lineMap.debito][col]) || 0 : 0;
                const notas = lineMap.notas !== undefined ? parseFloat(searchRange[lineMap.notas][col]) || 0 : 0;
                const dinheiro = lineMap.dinheiro !== undefined ? parseFloat(searchRange[lineMap.dinheiro][col]) || 0 : 0;
                const moeda = lineMap.moeda !== undefined ? parseFloat(searchRange[lineMap.moeda][col]) || 0 : 0;
                const baratao = lineMap.baratao !== undefined ? parseFloat(searchRange[lineMap.baratao][col]) || 0 : 0;

                const totalDinheiro = notas + dinheiro + moeda;
                const totalGeral = pix + credito + debito + totalDinheiro + baratao;
                dailyPix += pix; dailyCredito += credito; dailyDebito += debito; dailyDinheiro += totalDinheiro;

                if (totalGeral > 0) {
                    await supabase.from('FechamentoFrentista').insert({
                        fechamento_id: fechamentoId, frentista_id: frentistaId,
                        valor_pix: pix, valor_cartao_credito: credito, valor_cartao_debito: debito,
                        valor_dinheiro: totalDinheiro, valor_conferido: totalGeral, valor_moedas: moeda,
                        baratao: baratao, posto_id: 1
                    });
                }
            }

            // 7. Recebimentos
            await supabase.from('Recebimento').delete().eq('fechamento_id', fechamentoId);
            const recebimentos = [];
            if (dailyDinheiro > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DINHEIRO, valor: dailyDinheiro });
            if (dailyPix > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.PIX, valor: dailyPix });
            if (dailyCredito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.CREDITO, valor: dailyCredito });
            if (dailyDebito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DEBITO, valor: dailyDebito });
            if (recebimentos.length > 0) await supabase.from('Recebimento').insert(recebimentos);

            process.stdout.write('OK');
        }
    } catch (err) { console.error('\n❌ Erro:', err); }
}

async function main() {
    await migrateMonth('Mes, 01.');
    await migrateMonth('Mes, 02.');
    console.log('\n\n✅ Migração concluída!');
}

main();
