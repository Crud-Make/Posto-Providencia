
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const daysToCheck = [2, 3, 4, 5, 6];

for (const day of daysToCheck) {
    let startLine = -1;
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row.some(cell => typeof cell === 'string' && cell.includes(`Caixa Dia ${day.toString().padStart(2, '0')}`))) {
            startLine = i;
            break;
        }
    }

    if (startLine !== -1) {
        console.log(`\n--- Dia ${day} ---`);
        const block = data.slice(startLine, startLine + 35);

        // Find APP row
        const appRow = block.find(r => r && r.some(c => typeof c === 'string' && c.includes('APP, Baratao')));
        if (appRow) {
            console.log(`APP Row: ${JSON.stringify(appRow)}`);
        } else {
            console.log('APP Row not found');
        }

        // Find Venda Frentistas total
        const vfrRow = block.find(r => r && r.some(c => typeof c === 'string' && c.includes('Venda Frentistas')));
        const totalFrent = vfrRow ? vfrRow[12] : 'N/A'; // Col 12 (M) usually
        console.log(`Total Frentistas (Spreadsheet): ${totalFrent}`);
    }
}
