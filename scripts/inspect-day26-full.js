
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const day = 26;
const startLine = 1 + (day - 1) * 36;
console.log(`--- Dia ${day} (Start: ${startLine}) ---`);
for (let i = 0; i < 40; i++) {
    const row = data[startLine + i];
    if (row) {
        console.log(`+${i} [${row.length}]: ${JSON.stringify(row)}`);
    } else {
        console.log(`+${i}: EMPTY`);
    }
}
