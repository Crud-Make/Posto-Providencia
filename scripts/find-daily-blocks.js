
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

for (let i = 0; i < 500; i++) {
    const row = data[i];
    if (row && row.some(cell => typeof cell === 'string' && cell.includes('Caixa Dia'))) {
        console.log(`Linha ${i + 1}: ${row.find(cell => typeof cell === 'string' && cell.includes('Caixa Dia'))}`);
    }
}
