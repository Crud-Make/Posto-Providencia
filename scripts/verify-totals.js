
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Mes, 01.'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log('Linha 10 (Dia 1 Total):', data[10]);
    console.log('Linha 46 (Dia 2 Total):', data[46]);

} catch (error) {
    console.error('Erro ao ler planilha:', error.message);
}
