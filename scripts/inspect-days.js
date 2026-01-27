
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

for (let day = 24; day <= 27; day++) {
    const startLine = 1 + (day - 1) * 36;
    console.log(`\n--- Dia ${day} (Linha ${startLine + 1}) ---`);
    console.log(`Célula B: ${data[startLine][2]}`);

    // Total Vendas (Bomba) - Linha +9, Col H (index 7)
    const totalVendas = data[startLine + 9] ? data[startLine + 9][7] : 'N/A';
    console.log(`Total Vendas (Bomba): ${totalVendas}`);

    // Total Frentistas - Linha +28, Col M (index 12)
    const totalFrentistas = data[startLine + 28] ? data[startLine + 28][12] : 'N/A';
    console.log(`Total Frentistas (Spreadsheet): ${totalFrentistas}`);
}
