
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '../docs/data/Posto,Jorro, 2026.xlsx');

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Mes, 01.'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const day = 24;
// Find block
let startLine = -1;
for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.some(cell => typeof cell === 'string' && cell.includes(`Caixa Dia ${day}`))) {
        startLine = i;
        break;
    }
}

console.log(`Block start: ${startLine}`);
const searchRange = data.slice(startLine, startLine + 40);

const lineMap = {};
searchRange.forEach((row, idx) => {
    if (!row || row.length < 3) return;
    const label = String(row[2] || '').trim();
    console.log(`Idx ${idx} (Row +${idx}): Label='${label}'`);

    if (label === 'Pix') lineMap.pix = idx;
    if (label === 'Cartao Credito' || label === 'Cartão Crédito') lineMap.credito = idx;
    if (label === 'Cartao Debito' || label === 'Cartão Débito') lineMap.debito = idx;
    if (label === 'Notas') lineMap.notas = idx;
    if (label === 'Baratao' || label === 'Baratão') lineMap.baratao = idx;
    if (label === 'Dinheiro') lineMap.dinheiro = idx;
    if (label === 'Moeda') lineMap.moeda = idx;
});

console.log('LineMap:', lineMap);

// Simulate extraction
const attendantIds = [1, 2, 3, 4, 5, 6, 7];
let dailyPix = 0;

for (let j = 0; j < 7; j++) {
    const col = 3 + j;
    const pix = lineMap.pix !== undefined ? parseFloat(searchRange[lineMap.pix][col]) || 0 : 0;
    console.log(`Frentista ${j + 1} (Col ${col}): Pix=${pix}`);
    dailyPix += pix;
}
console.log(`Total Pix Calculated: ${dailyPix}`);
