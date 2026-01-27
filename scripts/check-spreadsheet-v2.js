
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    ['POSTO JORRO 2026', 'AFERICAO'].forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        if (sheet) {
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            console.log(`\n--- Primeiras 10 linhas da aba "${sheetName}" ---`);
            data.slice(0, 10).forEach((row, i) => {
                console.log(`Linha ${i}:`, row);
            });
        }
    });

} catch (error) {
    console.error('Erro ao ler planilha:', error.message);
}
