
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Mes, 01.'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rowFrentista = data[29];
    console.log('Frentista Total Row Array:');
    rowFrentista.forEach((val, i) => console.log(`Index ${i}: ${val}`));

} catch (error) {
    console.error('Erro ao ler planilha:', error.message);
}
