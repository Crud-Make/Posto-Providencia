import React, { useMemo } from 'react';
import { usePeriodo } from '@/contexts/usePeriodo';
import { usePosto } from '@/contexts/usePosto';
import { formatarMesBR, hojeIso } from '@/utils/periodo';
import { Calendario, modoMes } from '@/shared/ui/calendario';
import { PlanilhaDoMes } from '@/widgets/planilha-do-mes';

/**
 * Planilha do Mês — a aba de resumo da planilha do posto, dentro do sistema.
 *
 * @remarks Tela própria, e não uma seção da Visão do Proprietário, porque é uma
 *          leitura de outro tipo: lá são cartões de acompanhamento, aqui é a
 *          planilha em si — três tabelas densas, na mesma ordem e com os mesmos
 *          nomes de coluna que o dono já lê há anos.
 *
 *          O mês vem do `PeriodoContext`, o mesmo das demais telas de análise:
 *          trocar o mês aqui mantém a escolha ao navegar.
 */
const TelaPlanilhaMensal: React.FC = () => {
    const { mes: mesSelecionado, definirMes } = usePeriodo();
    const { postoAtivoId } = usePosto();

    // Mês futuro não tem dado — travar o calendário evita a tela vazia sem motivo.
    const mesLimite = useMemo(() => hojeIso().slice(0, 7), []);

    return (
        <div className="w-full">
            <PlanilhaDoMes
                postoId={postoAtivoId}
                mesIso={mesSelecionado}
                mesReferencia={formatarMesBR(mesSelecionado)}
                seletorDeMes={
                    <Calendario
                        modo={modoMes}
                        valor={mesSelecionado}
                        aoMudar={definirMes}
                        maximo={mesLimite}
                    />
                }
            />
        </div>
    );
};

export default TelaPlanilhaMensal;
