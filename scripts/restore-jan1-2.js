
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

async function restoreJan1and2() {
    console.log('🚀 Iniciando Restauração dos Dias 01 e 02 de Janeiro...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Mes, 01.'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const attendantIds = [1, 2, 3, 4, 5, 6, 7]; // Filip, Paulo, Barbra, Rosimeire, Sinho, Nayla, Elyon
        const PAGAMENTO_ID = { DINHEIRO: 1, PIX: 2, CREDITO: 3, DEBITO: 4 };

        // 1. Localizar os dias
        const blocks = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (row && row.some(cell => typeof cell === 'string' && cell.includes('Caixa Dia'))) {
                const cellVal = row.find(cell => typeof cell === 'string' && cell.includes('Caixa Dia'));
                const match = cellVal.match(/Dia\s+(\d+)\s+Posto/);
                if (match) {
                    const day = parseInt(match[1]);
                    if (day === 1 || day === 2) {
                        blocks.push({ day, startLine: i });
                    }
                }
            }
        }

        console.log(`📊 Encontrados ${blocks.length} blocos para restaurar (Dias 1 e 2).`);

        for (const block of blocks) {
            const dateStr = `2026-01-${block.day.toString().padStart(2, '0')}`;
            process.stdout.write(`\n📅 Restaurando Dia ${block.day} (${dateStr})... `);

            // Localizar sub-seções dentro do bloco (até a próxima linha "Caixa Dia" ou 40 linhas)
            const searchRange = data.slice(block.startLine, block.startLine + 60); // Aumentei range para garantir

            // Mapeamento dinâmico de linhas
            const lineMap = {};
            const nozzleMap = {
                'G,C. Bico 01': 7, 'G,A.Bico 02': 8, 'Etanol,Bico 03': 9,
                'DS:.10,Bico 04': 10, 'G,C, Bico 05': 11, 'G,C. Bico 06': 12
            };
            const fuelMap = { 7: 1, 8: 2, 9: 3, 10: 4, 11: 1, 12: 1 };
            const priceMap = { 1: 6.48, 2: 6.48, 3: 4.98, 4: 6.38 };

            searchRange.forEach((row, idx) => {
                const label = String(row[2] || '').trim();
                // Normalização de strings para garantir match
                const normalizedLabel = label.normalize('NFD').replace(/[\u0300-\u036f]/g, "");

                if (normalizedLabel === 'Pix') lineMap.pix = idx;
                if (normalizedLabel === 'Cartao Credito') lineMap.credito = idx;
                if (normalizedLabel === 'Cartao Debito') lineMap.debito = idx;
                if (normalizedLabel === 'Notas') lineMap.notas = idx;
                if (normalizedLabel === 'Moeda') lineMap.moeda = idx;
                if (normalizedLabel === 'Baratao') lineMap.baratao = idx;
                if (normalizedLabel === 'Dinheiro') lineMap.dinheiro = idx;
                if (label.includes('Venda Frentistas')) lineMap.totalRecebido = idx;
                if (label.includes('Venda Concentrador')) lineMap.totalVendas = idx;

                // Mapear bicos
                for (const key in nozzleMap) {
                    if (label === key) {
                        if (!lineMap.nozzles) lineMap.nozzles = {};
                        lineMap.nozzles[key] = idx;
                    }
                }
            });

            // Se não encontrou "Venda Concentrador", busca na coluna 12 (M) da linha +29 como fallback
            const totalVendas = lineMap.totalVendas !== undefined ?
                parseFloat(searchRange[lineMap.totalVendas][12]) :
                (parseFloat(searchRange[29] && searchRange[29][12]) || 0);

            const totalRecebido = lineMap.totalRecebido !== undefined ?
                parseFloat(searchRange[lineMap.totalRecebido][12]) :
                (parseFloat(searchRange[28] && searchRange[28][12]) || 0);

            console.log(` | Vendas: ${totalVendas} | Recebido: ${totalRecebido}`);

            // 3. Upsert Fechamento
            const { data: fechamentoRes } = await supabase
                .from('Fechamento')
                .select('id')
                .eq('data', dateStr)
                .eq('turno_id', 1)
                .single();

            let fechamentoId;
            if (fechamentoRes) {
                fechamentoId = fechamentoRes.id;
                await supabase.from('Fechamento').update({
                    total_vendas: totalVendas || 0,
                    total_recebido: totalRecebido || 0,
                    diferenca: (totalRecebido || 0) - (totalVendas || 0)
                }).eq('id', fechamentoId);
            } else {
                const { data: newFech, error: createError } = await supabase.from('Fechamento').insert({
                    posto_id: 1,
                    data: dateStr,
                    turno_id: 1,
                    total_vendas: totalVendas || 0,
                    total_recebido: totalRecebido || 0,
                    diferenca: (totalRecebido || 0) - (totalVendas || 0),
                    status: 'FECHADO',
                    usuario_id: 1
                }).select().single();
                if (createError) { console.error('E', createError.message); continue; }
                fechamentoId = newFech.id;
            }

            // 4. Inserir Leituras
            if (lineMap.nozzles) {
                // DELETE previous readings for this date to avoid duplicates
                await supabase.from('Leitura').delete().eq('data', dateStr);

                const readings = [];
                for (const bicoName in lineMap.nozzles) {
                    const idx = lineMap.nozzles[bicoName];
                    const row = searchRange[idx];
                    const bicoId = nozzleMap[bicoName];
                    const combustivelId = fuelMap[bicoId];
                    const preco = priceMap[combustivelId] || parseFloat(row[6]) || 0;

                    readings.push({
                        posto_id: 1,
                        bico_id: bicoId,
                        combustivel_id: combustivelId,
                        data: dateStr,
                        leitura_inicial: parseFloat(row[3]) || 0,
                        leitura_final: parseFloat(row[4]) || 0,
                        litros_vendidos: parseFloat(row[5]) || 0,
                        preco_litro: preco,
                        valor_total: (parseFloat(row[5]) || 0) * preco,
                        turno_id: 1,
                        usuario_id: 1
                    });
                }
                if (readings.length > 0) {
                    await supabase.from('Leitura').insert(readings);
                    console.log(` | Leituras inseridas: ${readings.length}`);
                }
            }

            // 5. Inserir Frentistas
            await supabase.from('FechamentoFrentista').delete().eq('fechamento_id', fechamentoId);

            let dailyPix = 0, dailyCredito = 0, dailyDebito = 0, dailyDinheiro = 0;
            let insertedFrentistas = 0;

            for (let j = 0; j < 7; j++) {
                const attendantId = attendantIds[j];
                const col = 3 + j; // D..J

                const pix = lineMap.pix !== undefined ? parseFloat(searchRange[lineMap.pix][col]) || 0 : 0;
                const credito = lineMap.credito !== undefined ? parseFloat(searchRange[lineMap.credito][col]) || 0 : 0;
                const debito = lineMap.debito !== undefined ? parseFloat(searchRange[lineMap.debito][col]) || 0 : 0;
                const notas = lineMap.notas !== undefined ? parseFloat(searchRange[lineMap.notas][col]) || 0 : 0;
                const baratao = lineMap.baratao !== undefined ? parseFloat(searchRange[lineMap.baratao][col]) || 0 : 0;
                const dinheiro = lineMap.dinheiro !== undefined ? parseFloat(searchRange[lineMap.dinheiro][col]) || 0 : 0;
                const moeda = lineMap.moeda !== undefined ? parseFloat(searchRange[lineMap.moeda][col]) || 0 : 0;

                const totalDinheiro = notas + dinheiro + moeda;
                const totalGeral = pix + credito + debito + totalDinheiro + baratao;

                dailyPix += pix;
                dailyCredito += credito;
                dailyDebito += debito;
                dailyDinheiro += totalDinheiro;

                if (totalGeral > 0) {
                    await supabase.from('FechamentoFrentista').insert({
                        fechamento_id: fechamentoId,
                        frentista_id: attendantId,
                        valor_pix: pix,
                        valor_cartao_credito: credito,
                        valor_cartao_debito: debito,
                        valor_dinheiro: totalDinheiro,
                        valor_conferido: totalGeral,
                        valor_moedas: moeda,
                        baratao: baratao,
                        posto_id: 1
                    });
                    insertedFrentistas++;
                }
            }
            console.log(` | Frentistas inseridos: ${insertedFrentistas}`);

            // 6. Atualizar Recebimentos
            await supabase.from('Recebimento').delete().eq('fechamento_id', fechamentoId);
            const recebimentos = [];
            if (dailyDinheiro > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DINHEIRO, valor: dailyDinheiro });
            if (dailyPix > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.PIX, valor: dailyPix });
            if (dailyCredito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.CREDITO, valor: dailyCredito });
            if (dailyDebito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DEBITO, valor: dailyDebito });

            if (recebimentos.length > 0) {
                await supabase.from('Recebimento').insert(recebimentos);
            }
        }

        console.log('\n\n✅ Restauração Finalizada com Sucesso!');

    } catch (error) {
        console.error('\n❌ Erro:', error);
    }
}

restoreJan1and2();
