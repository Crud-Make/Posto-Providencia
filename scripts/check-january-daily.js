
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'Mes, 01.';
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- Primeiras 30 linhas da aba "${sheetName}" ---`);
        data.slice(0, 30).forEach((row, i) => {
            console.log(`Linha ${i}:`, row);
        });
    }

} catch (error) {
    console.error('Erro ao ler planilha:', error.message);
}
