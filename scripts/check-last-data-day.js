
import XLSX from 'xlsx';
import path from 'path';

const filePath = path.join('/home/thygas/.gemini/antigravity/scratch/Posto-Providencia/docs/data/Posto,Jorro, 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Abas disponíveis:', workbook.SheetNames);

    // Verificar se há dados em Fevereiro (Mes, 02.)
    const sheetFeb = workbook.Sheets['Mes, 02.'];
    if (sheetFeb) {
        const dataFeb = XLSX.utils.sheet_to_json(sheetFeb, { header: 1 });
        // Procurar pelo último "Caixa Dia" que tem valores preenchidos
        let lastDay = 0;
        for (let i = 0; i < dataFeb.length; i++) {
            const row = dataFeb[i];
            const cellVal = row[1] || row[2] || "";
            if (typeof cellVal === 'string' && cellVal.includes('Caixa Dia')) {
                // Verificar se o total de vendas (normalmente 9 linhas abaixo) é > 0
                const totalRow = dataFeb[i + 9];
                if (totalRow && totalRow[7] > 0) {
                    const match = cellVal.match(/Dia (\d+)/);
                    if (match) lastDay = parseInt(match[1]);
                }
            }
        }
        console.log(`Último dia com dados em Fevereiro: ${lastDay}`);
    } else {
        console.log('Aba de Fevereiro não encontrada.');
    }

} catch (error) {
    console.error('Erro:', error.message);
}
