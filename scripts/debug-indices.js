
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Mes, 01.'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rowDay1Total = data[10];
    console.log('Dia 1 Total Array:');
    rowDay1Total.forEach((val, i) => console.log(`Index ${i}: ${val}`));

    console.log('\nDia 2 Total Array (Linha 46/47):');
    const rowDay2Total = data[46];
    rowDay2Total.forEach((val, i) => console.log(`Index ${i}: ${val}`));

} catch (error) {
    console.error('Erro ao ler planilha:', error.message);
}
