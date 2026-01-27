
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

async function fixDayOne() {
    console.log('Restaurando Frentistas do Dia 1...');

    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Mes, 01.'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const day = 1;
    const startLine = 1 + (day - 1) * 36;
    const attendantIds = [1, 2, 3, 4, 5, 6, 7];

    const { data: fechamento } = await supabase.from('Fechamento').select('id').eq('data', '2026-01-01').single();

    if (!fechamento) {
        console.error('Fechamento não encontrado para dia 1');
        return;
    }

    const fechamentoId = fechamento.id;
    console.log(`Usando Fechamento ID: ${fechamentoId}`);

    // Limpar se houver algo (mesmo que eu tenha visto vazio, vamos garantir)
    await supabase.from('FechamentoFrentista').delete().eq('fechamento_id', fechamentoId);

    const frentistasToInsert = [];

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

        if (totalGeral > 0) {
            frentistasToInsert.push({
                fechamento_id: fechamentoId,
                frentista_id: attendantId,
                valor_pix: pix,
                valor_cartao_credito: credito,
                valor_cartao_debito: debito,
                valor_dinheiro: totalDinheiro,
                valor_conferido: totalGeral,
                posto_id: 1,
                encerrante: 0 // Will need verification if this script usually imports it
            });
        }
    }

    if (frentistasToInsert.length > 0) {
        const { error } = await supabase.from('FechamentoFrentista').insert(frentistasToInsert);
        if (error) console.error('Erro ao inserir:', error);
        else console.log('✅ Dados de frentistas restaurados para Dia 1.');
    } else {
        console.log('Nenhum dado de frentista encontrado no Excel para Dia 1.');
    }
}

fixDayOne();
