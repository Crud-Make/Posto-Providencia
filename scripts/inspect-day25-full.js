
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const day = 25;
// find start line
let startLine = -1;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.some(cell => typeof cell === 'string' && cell.includes(`Caixa Dia ${day}`))) {
        startLine = i;
        break;
    }
}

if (startLine === -1) {
    console.log('Dia 25 não encontrado');
} else {
    console.log(`--- Dia 25 (Start: ${startLine}) ---`);
    for (let i = 0; i < 40; i++) {
        const row = data[startLine + i];
        if (row) {
            // simplified logging
            console.log(`+${i}: ${JSON.stringify(row)}`);
        }
    }
}
