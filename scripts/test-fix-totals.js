
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

    // Find bottom rows
    let concentradorRow = null;
    let frentistasRow = null;

    // Search around line +28 to +32
    for (let offset = 25; offset <= 35; offset++) {
        const row = data[startLine + offset];
        if (!row) continue;
        if (row.some(c => typeof c === 'string' && c.includes('Venda Concentrador'))) concentradorRow = row;
        if (row.some(c => typeof c === 'string' && c.includes('Venda Frentis'))) frentistasRow = row;
    }

    if (concentradorRow && frentistasRow) {
        // Get max numeric value in row
        const maxConc = Math.max(...concentradorRow.filter(c => typeof c === 'number'));
        const maxFrent = Math.max(...frentistasRow.filter(c => typeof c === 'number'));

        console.log(`Dia ${day}: Conc=${maxConc.toFixed(2)} | Frent=${maxFrent.toFixed(2)} | Diff=${(maxFrent - maxConc).toFixed(2)}`);
    } else {
        console.log(`Dia ${day}: Rows not found`);
    }
}
