/**
 * API pública do widget da planilha do mês.
 *
 * @remarks Só o componente sai daqui. O estado, o desenho e as séries dos
 *          gráficos são detalhe interno — quem importar de dentro da fatia
 *          congela um detalhe que ainda vai mudar quando a tela for ligada ao
 *          banco.
 */
export { PlanilhaDoMes } from './ui/planilha-do-mes';
