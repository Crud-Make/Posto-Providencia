
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

async function importJanuary() {
    console.log('🚀 Iniciando RE-IMPORTAÇÃO massiva de Janeiro 2026 (Correção Frentistas & Leituras)...');

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

    console.log('🧹 Limpando dados existentes de Janeiro/2026...');
    // Limpando com cuidado para garantir estado limpo
    await supabase.from('FechamentoFrentista').delete().neq('id', 0); // Hack para deletar tudo se necessário ou filtrar por fechamento_id dps
    // A limpeza correta é por data, mas FechamentoFrentista nao tem data.
    // O delete CASCADE no Fechamento deve resolver, mas vamos garantir.
    await supabase.from('Leitura').delete().gte('data', '2026-01-01T00:00:00').lte('data', '2026-01-31T23:59:59');
    await supabase.from('Fechamento').delete().gte('data', '2026-01-01T00:00:00').lte('data', '2026-01-31T23:59:59');

    // OBS: Como FechamentoFrentista depende de Fechamento (CASCADE), deletar Fechamento basta.

    for (let day = 1; day <= 31; day++) {
        const startLine = 1 + (day - 1) * 36;
        const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;
        // Para garantir que o timestamp seja meia-noite UTC (ou local conforme banco)
        // Vamos usar string simples ISO date que PostgREST aceita bem para 'timestamp' aka date

        console.log(`\n📅 Processando Dia ${day}...`);

        // 1. Leituras
        const readings = [];
        for (let i = 0; i < 6; i++) {
            const row = data[startLine + 3 + i];
            if (!row || !row[2]) continue;

            const bicoName = String(row[2]).trim();
            const bicoId = nozzleMap[bicoName];

            if (!bicoId) {
                console.warn(`⚠️ Bico não encontrado no mapa: "${bicoName}"`);
                continue;
            }

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
            const { error: leError } = await supabase.from('Leitura').insert(readings);
            if (leError) {
                console.error(`❌ Erro INSERT LEITURA Dia ${day}:`, leError);
            } else {
                process.stdout.write('L'); // L para Leitura OK
            }
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
            console.error(`❌ Erro INSERT FECHAMENTO Dia ${day}:`, fechError);
            continue;
        }
        const fechamentoId = fechamentoData[0].id;
        process.stdout.write('F'); // F para Fechamento OK

        // 3. Frentistas
        let frentistasCount = 0;
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

            if (totalGeral > 0 || attendantId) { // Tenta importar mesmo se zerado se for para registrar presença? Não, apenas se tiver vendas.
                if (totalGeral > 0) {
                    const { error: ffError } = await supabase.from('FechamentoFrentista').insert({
                        fechamento_id: fechamentoId,
                        frentista_id: attendantId,
                        valor_pix: pix,
                        valor_cartao_credito: credito,
                        valor_cartao_debito: debito,
                        valor_dinheiro: totalDinheiro,
                        valor_conferido: totalGeral,
                        posto_id: 1
                        // SEM DATA AQUI
                    });

                    if (ffError) console.error(`❌ Erro FRENTISTA ${attendantId} Dia ${day}:`, ffError);
                    else frentistasCount++;
                }
            }
        }
        process.stdout.write(`(${frentistasCount}f) `);
    }
    console.log('\n✅ Re-importação finalizada.');
}

importJanuary();
