
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

async function importJanuary() {
    console.log('🚀 Iniciando importação massiva de Janeiro 2026 (Indices Corrigidos)...');

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

    const attendantIds = [1, 2, 3, 4, 5, 6, 7]; // Filip, Paulo, Barbra, Rosimeire, Sinho, Nayla, Elyon

    // Limpar dados de Janeiro (para evitar duplicatas)
    console.log('🧹 Limpando dados existentes de Janeiro/2026...');
    await supabase.from('Leitura').delete().gte('data', '2026-01-01').lte('data', '2026-01-31');
    await supabase.from('Fechamento').delete().gte('data', '2026-01-01').lte('data', '2026-01-31');

    for (let day = 1; day <= 31; day++) {
        const startLine = 1 + (day - 1) * 36;
        const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;

        console.log(`📅 Processando Dia ${day}...`);

        // 1. Leituras
        const readings = [];
        for (let i = 0; i < 6; i++) {
            const row = data[startLine + 3 + i];
            if (!row || !row[2]) continue;

            const bicoName = row[2].trim();
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
                turno_id: 1
            });
        }

        if (readings.length > 0) {
            await supabase.from('Leitura').insert(readings);
        }

        // 2. Fechamento Geral
        // Linha "Total." (index start + 9): O Valor R$ está no Index 7
        const totalRow = data[startLine + 9];
        if (!totalRow) continue;
        const totalVendas = parseFloat(totalRow[7]) || 0;

        // 3. Recebimentos Frentistas (Venda Frentistas . linha index start + 28)
        // O Total Recebido está no Index 12
        const frentistaTotalRow = data[startLine + 28];
        if (!frentistaTotalRow) continue;
        const totalRecebido = parseFloat(frentistaTotalRow[12]) || 0;

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
            console.error(`❌ Erro no fechamento do dia ${day}:`, fechError);
            continue;
        }

        const fechamentoId = fechamentoData[0].id;

        // 4. Detalhes Frentistas (FechamentoFrentista)
        for (let j = 0; j < 7; j++) {
            const attendantId = attendantIds[j];
            const col = 3 + j;

            // Pix (index start + 21)
            const pix = parseFloat(data[startLine + 21][col]) || 0;
            // Credito (index start + 22)
            const credito = parseFloat(data[startLine + 22][col]) || 0;
            // Debito (index start + 23)
            const debito = parseFloat(data[startLine + 23][col]) || 0;
            // Notas (index start + 25)
            const notas = parseFloat(data[startLine + 25][col]) || 0;
            // Dinheiro (index start + 27)
            const dinheiro = parseFloat(data[startLine + 27][col]) || 0;

            const totalDinheiro = notas + dinheiro;

            if (pix > 0 || credito > 0 || debito > 0 || totalDinheiro > 0) {
                await supabase.from('FechamentoFrentista').insert({
                    fechamento_id: fechamentoId,
                    frentista_id: attendantId,
                    valor_pix: pix,
                    valor_cartao_credito: credito,
                    valor_cartao_debito: debito,
                    valor_dinheiro: totalDinheiro,
                    valor_conferido: pix + credito + debito + totalDinheiro,
                    data: dateStr
                });
            }
        }
    }

    console.log('\n✅ Importação concluída com sucesso!');
}

importJanuary();
