import type { Escala } from '../../../services/api/escala.service';
import type { Frentista } from '@posto/types';

/**
 * Utilitário para exportar a escala mensal para PDF (via janela de impressão)
 * Gera um documento formatado em modo paisagem com estilos otimizados para papel.
 * 
 * @param dataReferencia - Data do mês de referência
 * @param frentistas - Lista de frentistas ativos
 * @param escalas - Lista de escalas do mês
 * @param dias - Array com os dias do mês
 * @param ehFinalDeSemana - Função para verificar finais de semana
 * @param formatarData - Função para formatar data ISO
 */
export const exportarEscalaParaPdf = (
    dataReferencia: Date,
    frentistas: Frentista[],
    escalas: Escala[],
    dias: number[],
    ehFinalDeSemana: (dia: number) => boolean,
    formatarData: (ano: number, mes: number, dia: number) => string
) => {
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
        alert('Por favor, permita pop-ups para exportar o PDF');
        return;
    }

    const nomeMes = dataReferencia.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Escala Mensal - ${nomeMes}</title>
            <style>
                @page { size: landscape; margin: 1cm; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    font-size: 10px;
                    margin: 0;
                    padding: 24px;
                    color: #1e293b;
                }
                .header-container {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 20px;
                }
                h1 { 
                    font-size: 24px;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: #0f172a;
                }
                .subtitle {
                    color: #64748b;
                    margin-top: 5px;
                    font-size: 14px;
                    font-weight: 600;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-top: 10px;
                    background: white;
                }
                th, td { 
                    border: 1px solid #cbd5e1; 
                    padding: 10px 4px; 
                    text-align: center;
                }
                th { 
                    background-color: #f8fafc; 
                    font-weight: 800;
                    font-size: 10px;
                    color: #475569;
                }
                .frentista-col {
                    text-align: left;
                    padding-left: 15px;
                    font-weight: 800;
                    background-color: #f1f5f9;
                    color: #0f172a;
                    min-width: 160px;
                }
                .folga { 
                    background-color: #fee2e2; 
                    color: #b91c1c;
                    font-weight: 900;
                }
                .weekend { 
                    background-color: #f8fafc; 
                }
                .obs-icon {
                    color: #2563eb;
                    font-size: 10px;
                    margin-left: 2px;
                }
                .footer {
                    margin-top: 40px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    font-size: 10px;
                    color: #94a3b8;
                }
                .signature-box {
                    border-top: 1px solid #94a3b8;
                    width: 250px;
                    text-align: center;
                    padding-top: 5px;
                    color: #475569;
                    font-weight: bold;
                }
                .legend {
                    margin-top: 25px;
                    display: flex;
                    justify-content: center;
                    gap: 40px;
                    font-size: 11px;
                    font-weight: 700;
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .legend-box {
                    width: 20px;
                    height: 20px;
                    border: 1px solid #cbd5e1;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            </style>
        </head>
        <body>
            <div class="header-container">
                <h1>Escala de Revezamento</h1>
                <div class="subtitle">Posto Providência • ${nomeMes}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th class="frentista-col">Colaborador</th>
    `;

    dias.forEach(dia => {
        const d = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dia);
        const labelDia = diasSemana[d.getDay()];
        const ehFds = d.getDay() === 0 || d.getDay() === 6;
        html += `<th class="${ehFds ? 'weekend' : ''}">${dia}<br/><small style="font-weight: 400">${labelDia}</small></th>`;
    });

    html += `
                    </tr>
                </thead>
                <tbody>
    `;

    frentistas.forEach(frentista => {
        html += `<tr><td class="frentista-col">${frentista.nome}</td>`;

        dias.forEach(dia => {
            const strData = formatarData(dataReferencia.getFullYear(), dataReferencia.getMonth(), dia);
            const escala = escalas.find(e => e.frentista_id === frentista.id && e.data === strData);
            const ehFolga = escala?.tipo === 'FOLGA';
            const temObs = escala?.observacao && escala.observacao.trim() !== '';
            const d = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dia);
            const ehFds = d.getDay() === 0 || d.getDay() === 6;

            let classeCelula = ehFds ? 'weekend' : '';
            if (ehFolga) classeCelula += ' folga';

            let conteudoCelula = ehFolga ? 'F' : '•';
            if (temObs) conteudoCelula += ' <span class="obs-icon">📝</span>';

            html += `<td class="${classeCelula}">${conteudoCelula}</td>`;
        });

        html += `</tr>`;
    });

    html += `
                </tbody>
            </table>
            <div class="legend">
                <div class="legend-item">
                    <div class="legend-box folga">F</div>
                    <span>Folga Marcada</span>
                </div>
                <div class="legend-item">
                    <div class="legend-box weekend"></div>
                    <span>Sábado/Domingo</span>
                </div>
                <div class="legend-item">
                    <span style="font-size: 16px">📝</span>
                    <span>Observação no Verso/Sistema</span>
                </div>
            </div>
            
            <div class="footer">
                <div>
                    Documento impresso em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                </div>
                <div class="signature-box">
                    Responsável Administrativo
                </div>
            </div>
        </body>
        </html>
    `;

    janelaImpressao.document.write(html);
    janelaImpressao.document.close();

    janelaImpressao.onload = () => {
        janelaImpressao.focus();
        janelaImpressao.print();
    };
};
