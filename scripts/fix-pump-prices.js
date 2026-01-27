
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

async function fixPumpPrices() {
    console.log('🚀 Iniciando Correção de Preços nas Leituras...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Mes, 01.'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Mapeamento Bico -> Index na Planilha (relativo ao início do bloco)
        // Linha +3: Bico 01
        // Linha +4: Bico 02
        // Linha +5: Bico 03
        // Linha +6: Bico 04
        // Linha +7: Bico 05
        // Linha +8: Bico 06
        const bicosOffset = {
            'Bico 01': 3,
            'Bico 02': 4,
            'Bico 03': 5,
            'Bico 04': 6,
            'Bico 05': 7,
            'Bico 06': 8
        };

        // Mapeamento Nome Bico (Planilha) -> ID Bico (Banco)
        // IDs confirmados: 7, 8, 9, 10, 11, 12 (Bico 1..6)
        const bicoMap = {
            'Bico 01': 7,
            'Bico 02': 8,
            'Bico 03': 9,
            'Bico 04': 10,
            'Bico 05': 11,
            'Bico 06': 12
        };

        console.log('Mapeamento de Bicos Fixo:', bicoMap);

        // Iterar dias
        for (let day = 1; day <= 31; day++) {
            const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;
            let startLine = -1;

            // Find Start Line with robust search
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (row && row.some(cell => typeof cell === 'string' && cell.includes(`Caixa Dia ${day.toString().padStart(2, '0')}`))) {
                    startLine = i;
                    break;
                }
            }

            if (startLine === -1) {
                console.log(`Dia ${day}: Bloco não encontrado.`);
                continue;
            }

            console.log(`\n📅 Processando Dia ${day}...`);

            for (const [bicoName, offset] of Object.entries(bicosOffset)) {
                const row = data[startLine + offset];
                if (!row) continue;

                // Preço na Coluna G (index 6)
                let price = parseFloat(row[6]);

                // Se preço inválido (null/undefined), tentar pegar do bico anterior (lógica cascata comum em planilha)
                if (!price || isNaN(price)) {
                    // Fallback logic specific to spreadsheet quirks
                    // Se Bico 06 (offset 8) for null, pode ser null mesmo.
                    // Para simplificar: se for null, ignora update ou usa o anterior?
                    // Melhor logar e ver.
                    // console.log(`   ⚠️ ${bicoName}: Preço não encontrado na planilha (Linha ${startLine + offset}). Ignorando.`);
                    continue;
                }

                const bicoId = bicoMap[bicoName];
                if (!bicoId) continue;

                // Atualizar Leitura
                // Buscar leitura existente
                const { data: leitura } = await supabase
                    .from('Leitura')
                    .select('id, litros_vendidos, preco_litro')
                    .eq('data', dateStr)
                    .eq('bico_id', bicoId)
                    .single();

                if (leitura) {
                    // Só atualiza se o preço for diferente
                    if (Math.abs(leitura.preco_litro - price) > 0.01) {
                        const novoTotal = leitura.litros_vendidos * price;

                        await supabase.from('Leitura').update({
                            preco_litro: price,
                            valor_total: novoTotal
                        }).eq('id', leitura.id);

                        console.log(`   ✅ ${bicoName}: Preço corrigido de R$ ${leitura.preco_litro} para R$ ${price}. Total: R$ ${novoTotal.toFixed(2)}`);
                    } else {
                        // console.log(`   🆗 ${bicoName}: Preço já está correto (R$ ${price}).`);
                    }
                }
            }
        }

        console.log('\n✅ Correção de Preços Concluída!');

    } catch (error) {
        console.error('\n❌ Erro:', error);
    }
}

fixPumpPrices();
