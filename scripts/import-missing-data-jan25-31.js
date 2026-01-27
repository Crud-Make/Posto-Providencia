
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

async function importMissingData() {
    console.log('🚀 Iniciando Importação Complementar (25-31 Jan)...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['Mes, 01.'];
        if (!sheet) {
            throw new Error('Aba "Mes, 01." não encontrada na planilha.');
        }

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const attendantIds = [1, 2, 3, 4, 5, 6, 7]; // IDs confirmados: Filip, Paulo, Barbra, Rosimeire, Sinho, Nayla, Elyon

        for (let day = 25; day <= 31; day++) {
            const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;
            console.log(`\n📅 Processando ${dateStr}...`);

            // 1. Buscar Fechamento Existente
            const { data: fechamento, error: fetchError } = await supabase
                .from('Fechamento')
                .select('id')
                .eq('data', dateStr)
                .single();

            if (fetchError || !fechamento) {
                console.error(`⚠️ Fechamento não encontrado para ${dateStr}. Pule o dia ou crie o fechamento primeiro.`);
                continue;
            }

            const fechamentoId = fechamento.id;
            console.log(`   > Fechamento ID: ${fechamentoId}`);

            // 2. Extrair dados da planilha
            // A lógica de linha é: 1 (header) + (day - 1) * 36
            // Porém, cuidado com o indice do array 'data'.
            // No import-january-v3.js: const startLine = 1 + (day - 1) * 36;
            // index 0 = row 1 excel.
            // Se "day 1" é row 2 excel (index 1), então startLine deve ser o índice da linha "Dia 01".
            // Vamos assumir que a lógica do v3 estava correta: const startLine = 1 + (day - 1) * 36;

            const startLine = 1 + (day - 1) * 36;

            // Verificar se estamos na linha certa
            // A célula B do startLine deve conter "Dia XX"
            // Cell B is index 1 or 2 depending on merged cells? in v3 check logic wasn't explicit about checking cell content.
            // Let's trust the fixed step of 36 lines per day.

            // 3. Frentistas e Acumulação de Recebimentos
            let dailyPix = 0;
            let dailyCredito = 0;
            let dailyDebito = 0;
            let dailyDinheiro = 0;

            console.log(`   > Inserindo dados de frentistas...`);

            for (let j = 0; j < 7; j++) {
                const attendantId = attendantIds[j];
                const col = 3 + j; // Colunas D, E, F, G, H, I, J (indices 3..9)

                // Linhas relativas ao bloco do dia:
                // +21: Pix
                // +22: Cartão Crédito
                // +23: Cartão Débito
                // +25: Notas (Prazo)
                // +27: Dinheiro

                const pix = parseFloat((data[startLine + 21] || [])[col]) || 0;
                const credito = parseFloat((data[startLine + 22] || [])[col]) || 0;
                const debito = parseFloat((data[startLine + 23] || [])[col]) || 0;
                const notas = parseFloat((data[startLine + 25] || [])[col]) || 0;
                const dinheiro = parseFloat((data[startLine + 27] || [])[col]) || 0;

                const totalDinheiro = notas + dinheiro;
                const totalGeral = pix + credito + debito + totalDinheiro;

                // Acumular totais do dia para Recebimento (se necessário)
                dailyPix += pix;
                dailyCredito += credito;
                dailyDebito += debito;
                dailyDinheiro += totalDinheiro;

                if (totalGeral > 0) {
                    const { error: insertError } = await supabase.from('FechamentoFrentista').insert({
                        fechamento_id: fechamentoId,
                        frentista_id: attendantId,
                        valor_pix: pix,
                        valor_cartao_credito: credito,
                        valor_cartao_debito: debito,
                        valor_dinheiro: totalDinheiro,
                        valor_conferido: totalGeral,
                        posto_id: 1, // Assumindo posto 1
                        data_hora_envio: new Date().toISOString() // Simulando envio agora
                    });

                    if (insertError) {
                        console.error(`   ❌ Erro ao inserir frentista ${attendantId}:`, insertError.message);
                    } else {
                        // console.log(`      ✅ Frentista ${attendantId}: R$ ${totalGeral.toFixed(2)}`);
                        process.stdout.write('.');
                    }
                }
            }
            console.log(' OK');

            // 4. Atualizar/Inserir Recebimentos
            // O script v3 deletava e recriava. Aqui vamos apenas inserir se não existir, ou melhor, deletar os deste fechamento e recriar para garantir consistência.

            await supabase.from('Recebimento').delete().eq('fechamento_id', fechamentoId);

            const recebimentos = [];
            // IDs de FormaPagamento confirmados no v3
            const PAGAMENTO_ID = {
                DINHEIRO: 1,
                PIX: 2,
                CREDITO: 3,
                DEBITO: 4
            };

            if (dailyDinheiro > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DINHEIRO, valor: dailyDinheiro });
            if (dailyPix > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.PIX, valor: dailyPix });
            if (dailyCredito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.CREDITO, valor: dailyCredito });
            if (dailyDebito > 0) recebimentos.push({ fechamento_id: fechamentoId, forma_pagamento_id: PAGAMENTO_ID.DEBITO, valor: dailyDebito });

            if (recebimentos.length > 0) {
                const { error: recError } = await supabase.from('Recebimento').insert(recebimentos);
                if (recError) {
                    console.error(`   ❌ Erro ao inserir recebimentos:`, recError.message);
                } else {
                    console.log(`   ✅ Recebimentos atualizados.`);
                }
            }
        }

        console.log('\n✅ Importação complementar concluída!');

    } catch (error) {
        console.error('\n❌ Erro fatal:', error);
    }
}

importMissingData();
