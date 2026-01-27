
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const day = 1;
const startLine = 1 + (day - 1) * 36;
for (let i = 15; i <= 30; i++) {
    console.log(`Linha +${i}:`, data[startLine + i] ? data[startLine + i].slice(0, 15) : 'N/A');
}
