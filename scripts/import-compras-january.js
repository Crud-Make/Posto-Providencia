
import XLSX from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

async function getOrCreateFornecedor(nome) {
    const { data: existing } = await supabase.from('Fornecedor').select('id').ilike('nome', nome.trim()).single();
    if (existing) return existing.id;
    const { data: created } = await supabase.from('Fornecedor').insert({ nome: nome.trim() }).select().single();
    return created?.id;
}

async function importComprasJaneiro() {
    console.log('📦 Iniciando importação de compras de Janeiro/2026...');

    try {
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets['POSTO JORRO 2026'];
        if (!sheet) {
            console.error('Aba "POSTO JORRO 2026" não encontrada!');
            return;
        }

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Localizar bloco do mês 01
        let startIdx = -1;
        for (let i = 0; i < data.length; i++) {
            if (data[i] && data[i].some(cell => String(cell).includes('mês 01.'))) {
                startIdx = i;
                break;
            }
        }

        if (startIdx === -1) {
            console.error('Bloco "mês 01." não encontrado!');
            return;
        }

        // Localizar tabela de compras
        let tableHeaderIdx = -1;
        for (let i = startIdx; i < Math.min(startIdx + 100, data.length); i++) {
            if (data[i] && data[i].some(cell => String(cell).includes('Compra, LT.'))) {
                tableHeaderIdx = i;
                break;
            }
        }

        if (tableHeaderIdx === -1) {
            console.error('Tabela de compras não encontrada no bloco de Janeiro!');
            return;
        }

        const fornecedorId = await getOrCreateFornecedor('Distribuidora Padrão');
        const fuelMapping = {
            'G,Comum.': 1,
            'G,Aditivada.': 2,
            'Etanol.': 3,
            'Ds.10.': 4
        };

        const compras = [];
        const date = '2026-01-31T12:00:00Z'; // Final do mês

        for (let i = tableHeaderIdx + 1; i < tableHeaderIdx + 10; i++) {
            const row = data[i];
            if (!row || !row[1] || row[1].includes('Total')) break;

            const productName = String(row[1]).trim();
            const fuelId = fuelMapping[productName];

            if (fuelId) {
                const quantidade = parseFloat(row[2]) || 0;
                const valorTotal = parseFloat(row[3]) || 0;
                const custoPorLitro = parseFloat(row[4]) || (quantidade > 0 ? valorTotal / quantidade : 0);

                if (quantidade > 0) {
                    compras.push({
                        posto_id: 1,
                        data: date,
                        combustivel_id: fuelId,
                        fornecedor_id: fornecedorId,
                        quantidade_litros: quantidade,
                        valor_total: valorTotal,
                        custo_por_litro: custoPorLitro,
                        observacoes: 'Importação automática - Resumo Mensal'
                    });

                    console.log(`✅ Preparada compra: ${productName} - ${quantidade}L - R$ ${valorTotal}`);
                }
            }
        }

        if (compras.length > 0) {
            // Limpar compras anteriores de Jan/2026 para evitar duplicidade
            const startRange = '2026-01-01T00:00:00Z';
            const endRange = '2026-01-31T23:59:59Z';

            await supabase.from('Compra').delete()
                .eq('posto_id', 1)
                .gte('data', startRange)
                .lte('data', endRange);

            const { error: insError } = await supabase.from('Compra').insert(compras);
            if (insError) throw insError;

            console.log(`\n🚀 ${compras.length} compras importadas com sucesso!`);
        } else {
            console.log('Nenhuma compra encontrada para importar.');
        }

    } catch (err) {
        console.error('❌ Erro na importação:', err);
    }
}

importComprasJaneiro();
