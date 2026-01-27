
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'Mes, 01.';
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const blocks = [];
        data.forEach((row, i) => {
            const cellVal = row[1] || row[2] || "";
            if (typeof cellVal === 'string' && cellVal.includes('Caixa Dia')) {
                blocks.push({ line: i, content: cellVal });
            }
        });
        console.log('Blocos encontrados:', JSON.stringify(blocks, null, 2));
    }

} catch (error) {
    console.error('Erro ao ler planilha:', error.message);
}
