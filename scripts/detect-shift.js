
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

for (let day = 1; day <= 31; day++) {
    const startLine = 1 + (day - 1) * 36;
    if (day > 31 || !data[startLine]) break;

    // Procurar por "Pix" na linha +15
    const row15 = data[startLine + 15];
    const isShifted = row15 && row15.some(cell => typeof cell === 'string' && cell === 'Pix');
    console.log(`Dia ${day}: Layout ${isShifted ? 'NOVO (Shifted)' : 'ANTIGO'}`);
}
