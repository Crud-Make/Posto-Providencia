
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

async function fixFechamentoTotals() {
    console.log('🚀 Iniciando Correção de Totais (Fechamento)...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Mes, 01.'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Iterate days 1 to 31
        for (let day = 1; day <= 31; day++) {
            const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;
            const startLine = 1 + (day - 1) * 36;

            // Check if day exists in spreadsheet
            // We use the same offset detection as test-fix-totals
            let concentradorRow = null;
            let frentistasRow = null;

            // Search around line +25 to +35 relative to expected block start
            // Just to be safe, check validity of data[startLine]
            if (!data[startLine]) {
                console.log(`⚠️ Dia ${day}: Dados não encontrados na planilha (Linha ${startLine}). Zerando totais.`);
                await updateFechamento(dateStr, 0, 0);
                continue;
            }

            for (let offset = 20; offset <= 35; offset++) {
                const row = data[startLine + offset];
                if (!row) continue;
                if (row.some(c => typeof c === 'string' && c.includes('Venda Concentrador'))) concentradorRow = row;
                if (row.some(c => typeof c === 'string' && c.includes('Venda Frentis'))) frentistasRow = row;
            }

            if (concentradorRow && frentistasRow) {
                // Get max numeric value in row (Assuming total is the largest number)
                // Filter numbers larger than 10 to avoid percentages or small counters
                const numsConc = concentradorRow.filter(c => typeof c === 'number' && c > 10);
                const numsFrent = frentistasRow.filter(c => typeof c === 'number' && c > 10);

                const totalVendas = numsConc.length > 0 ? Math.max(...numsConc) : 0;
                const totalRecebido = numsFrent.length > 0 ? Math.max(...numsFrent) : 0;

                // Special check for Day 25 negative weirdness
                if (totalVendas < 0) {
                    console.log(`⚠️ Dia ${day}: Total negativo (${totalVendas}). Ignorando.`);
                    await updateFechamento(dateStr, 0, 0);
                    continue;
                }

                console.log(`✅ Dia ${day}: Vendas=${totalVendas.toFixed(2)} | Rec=${totalRecebido.toFixed(2)}`);
                await updateFechamento(dateStr, totalVendas, totalRecebido);

            } else {
                console.log(`⚠️ Dia ${day}: Linhas de totais não encontradas. Zerando.`);
                await updateFechamento(dateStr, 0, 0);
            }
        }

        console.log('\n✅ Correção concluída!');

    } catch (error) {
        console.error('\n❌ Erro:', error);
    }
}

async function updateFechamento(dateStr, totalVendas, totalRecebido) {
    const diferenca = totalRecebido - totalVendas;

    // Check if Fechamento exists
    const { data: fech } = await supabase.from('Fechamento').select('id').eq('data', dateStr).single();

    if (fech) {
        await supabase.from('Fechamento').update({
            total_vendas: totalVendas,
            total_recebido: totalRecebido,
            diferenca: diferenca
        }).eq('id', fech.id);
    } else {
        // Create if missing (should exist from previous scripts, but just in case)
        if (totalVendas > 0 || totalRecebido > 0) {
            await supabase.from('Fechamento').insert({
                data: dateStr,
                posto_id: 1,
                turno_id: 1,
                total_vendas: totalVendas,
                total_recebido: totalRecebido,
                diferenca: diferenca,
                status: 'FECHADO',
                usuario_id: 1
            });
        }
    }
}

fixFechamentoTotals();
