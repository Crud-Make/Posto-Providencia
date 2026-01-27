
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const day = 24;
const startLine = 1 + (day - 1) * 36;
console.log(`--- Dia ${day} ---`);
console.log(`Linha Pix (+21):`, data[startLine + 21] ? data[startLine + 21].slice(0, 15) : 'N/A');
console.log(`Linha C. Crédito (+22):`, data[startLine + 22] ? data[startLine + 22].slice(0, 15) : 'N/A');
console.log(`Linha C. Débito (+23):`, data[startLine + 23] ? data[startLine + 23].slice(0, 15) : 'N/A');
console.log(`Linha Dinheiro (+27):`, data[startLine + 27] ? data[startLine + 27].slice(0, 15) : 'N/A');
