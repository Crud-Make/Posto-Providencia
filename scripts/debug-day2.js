
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Mes, 01.'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Day 1 starts at line 1 (index 0 is empty header row probably, or data[1] is the start).
    // Previous analysis: 
    // Line 1: 'Caixa Dia 01 ...' (index 1 in data array if 0-based matches row number - 1? No, usually data[0] is row 1)
    // Let's dump lines 35 to 50 to see the transition from Day 1 to Day 2.
    // Day 2 expected around line 37.

    console.log('--- Checking Frentista Block Day 2 ---');
    for (let i = 55; i < 75; i++) {
        console.log(`Row ${i}:`, JSON.stringify(data[i]));
    }

} catch (error) {
    console.error('Erro ao ler planilha:', error.message);
}
