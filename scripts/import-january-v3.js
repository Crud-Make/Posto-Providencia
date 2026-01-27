
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

async function importJanuary() {
    console.log('🚀 Iniciando V3 Importação (Incluindo Recebimentos/Formas de Pagamento)...');

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Mes, 01.'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const nozzleMap = {
        'G,C. Bico 01': 7,
        'G,A.Bico 02': 8,
        'Etanol,Bico 03': 9,
        'DS:.10,Bico 04': 10,
        'G,C, Bico 05': 11,
        'G,C. Bico 06': 12
    };

    const fuelMap = { 7: 1, 8: 2, 9: 3, 10: 4, 11: 1, 12: 1 };
    const priceMap = { 1: 6.48, 2: 6.48, 3: 4.98, 4: 6.38 };
    const attendantIds = [1, 2, 3, 4, 5, 6, 7];

    // IDs de FormaPagamento confirmados
    const PAGAMENTO_ID = {
        DINHEIRO: 1,
        PIX: 2,
        CREDITO: 3,
        DEBITO: 4,
        APP: 7
    };

    console.log('🧹 Limpando dados de Janeiro/2026...');
    await supabase.from('Leitura').delete().gte('data', '2026-01-01T00:00:00').lte('data', '2026-01-31T23:59:59');
    await supabase.from('Recebimento').delete().gte('createdAt', '2026-01-01T00:00:00').lte('createdAt', '2026-02-01T00:00:00'); // Hacky fallback if no data field
    // Better: delete via Fechamento cascade
    await supabase.from('Fechamento').delete().gte('data', '2026-01-01T00:00:00').lte('data', '2026-01-31T23:59:59');

    for (let day = 1; day <= 31; day++) {
        const startLine = 1 + (day - 1) * 36;
        const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;

        console.log(`\n📅 Dia ${day}...`);

        // 1. Leituras
        const readings = [];
        for (let i = 0; i < 6; i++) {
            const row = data[startLine + 3 + i];
            if (!row || !row[2]) continue;

            const bicoName = String(row[2]).trim();
            const bicoId = nozzleMap[bicoName];

            if (!bicoId) continue;

            const inicial = parseFloat(row[3]) || 0;
            const final = parseFloat(row[4]) || 0;
            const litrosVendidos = parseFloat(row[5]) || 0;
            const combustivelId = fuelMap[bicoId];
            const preco = priceMap[combustivelId];
            const valorTotal = litrosVendidos * preco;

            readings.push({
                posto_id: 1,
                bico_id: bicoId,
                combustivel_id: combustivelId,
                data: dateStr,
                leitura_inicial: inicial,
                leitura_final: final,
                litros_vendidos: litrosVendidos,
                preco_litro: preco,
                valor_total: valorTotal,
                turno_id: 1,
                usuario_id: 1
            });
        }

        if (readings.length > 0) {
            await supabase.from('Leitura').insert(readings);
        }

        // 2. Fechamento Geral
        const totalRow = data[startLine + 9];
        const totalVendas = totalRow ? (parseFloat(totalRow[7]) || 0) : 0;

        const frentistaTotalRow = data[startLine + 28];
        const totalRecebido = frentistaTotalRow ? (parseFloat(frentistaTotalRow[12]) || 0) : 0;

        const { data: fechamentoData, error: fechError } = await supabase.from('Fechamento').insert({
            posto_id: 1,
            data: dateStr,
            total_vendas: totalVendas,
            total_recebido: totalRecebido,
            diferenca: totalRecebido - totalVendas,
            status: 'FECHADO',
            usuario_id: 1
        }).select();

        if (fechError || !fechamentoData) {
            console.error(`Erro Fechamento Dia ${day}:`, fechError);
            continue;
        }
        const fechamentoId = fechamentoData[0].id;

        // 3. Frentistas e Acumulação de Recebimentos
        let dailyPix = 0;
        let dailyCredito = 0;
        let dailyDebito = 0;
        let dailyDinheiro = 0;

        for (let j = 0; j < 7; j++) {
            const attendantId = attendantIds[j];
            const col = 3 + j;

            const pix = parseFloat((data[startLine + 21] || [])[col]) || 0;
            const credito = parseFloat((data[startLine + 22] || [])[col]) || 0;
            const debito = parseFloat((data[startLine + 23] || [])[col]) || 0;
            const notas = parseFloat((data[startLine + 25] || [])[col]) || 0;
            const dinheiro = parseFloat((data[startLine + 27] || [])[col]) || 0;

            const totalDinheiro = notas + dinheiro;
            const totalGeral = pix + credito + debito + totalDinheiro;

            // Acumular
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
                    posto_id: 1
                });
            }
        }

        // 4. Inserir Recebimentos (Formas de Pagamento)
        const recebimentos = [];
        if (dailyDinheiro > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DINHEIRO, valor: dailyDinheiro });
        if (dailyPix > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.PIX, valor: dailyPix });
        if (dailyCredito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.CREDITO, valor: dailyCredito });
        if (dailyDebito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DEBITO, valor: dailyDebito });

        if (recebimentos.length > 0) {
            await supabase.from('Recebimento').insert(recebimentos);
        }
        process.stdout.write('OK ');
    }
    console.log('\n✅ V3 Finalizada.');
}

importJanuary();
