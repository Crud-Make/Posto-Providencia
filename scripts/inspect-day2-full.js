
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const day = 2;
// Find block
let startLine = -1;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.some(cell => typeof cell === 'string' && cell.includes(`Caixa Dia ${day.toString().padStart(2, '0')}`))) {
        startLine = i;
        break;
    }
}

if (startLine === -1) {
    console.log(`Block for Day ${day} not found`);
} else {
    console.log(`Block start: ${startLine}`);
    const searchRange = data.slice(startLine, startLine + 40);
    searchRange.forEach((row, idx) => {
        if (!row) return;
        console.log(`+${idx}: ${JSON.stringify(row)}`);
    });
}
