/**
 * Calendário único do sistema.
 *
 * @remarks
 * Este componente é **fechado para modificação**: ele desenha a grade, navega, abre e fecha
 * o popover, respeita `minimo`/`maximo` e nada mais. O que varia mora fora dele, em dois
 * parâmetros:
 * - {@link ModoCalendario} (`modos.ts`) — a regra de seleção: dia, mês ou intervalo.
 * - {@link TomCalendario} (`tons.ts`) — todo o estilo.
 *
 * Modo novo ou tom novo não encostam neste arquivo. É o Open/Closed onde de fato varia.
 *
 * Promovido de `dashboard/components/date-range-picker.tsx`, que era o único calendário de
 * verdade do sistema e vivia trancado numa tela só — os demais lugares usavam
 * `<input type="date">` nativo, cada um com sua aparência e a critério do navegador.
 *
 * Toda conversão de data passa por `utils/periodo` (ISO local). Ver o porquê lá: em GMT-3,
 * `toISOString()` devolve o dia seguinte a partir das 21h.
 */
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { paraIsoLocal, paraMesLocal, hojeIso } from '@/utils/periodo';
import type { ModoCalendario } from './modos';
import { TONS, CELULA_EXTREMO, CELULA_DENTRO, CELULA_HOJE, type NomeTom } from './tons';

interface CalendarioProps<V> {
  /** Regra de seleção: `modoDia`, `modoMes` ou `modoIntervalo`. */
  readonly modo: ModoCalendario<V>;
  readonly valor: V;
  readonly aoMudar: (valor: V) => void;
  /** `escuro` para as telas pintadas de slate na unha, que ignoram o tema. Ver `tons.ts`. */
  readonly tom?: NomeTom;
  /** Texto antes do valor no botão — ex.: `"Data"`, `"Período"`. Omitido, não aparece. */
  readonly prefixo?: string;
  /** Limites de seleção, em ISO local. Célula fora do limite fica desabilitada. */
  readonly minimo?: string;
  readonly maximo?: string;
  readonly desabilitado?: boolean;
  /** Classes extras no botão que abre — para o gatilho encaixar no layout da tela. */
  readonly className?: string;
  /** Alinha o painel pela direita, quando o gatilho fica na borda direita da tela. */
  readonly alinhamento?: 'esquerda' | 'direita';
  readonly id?: string;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

/** Todos os dias da grade do mês, com `null` nos espaços antes do dia 1. */
function gradeDoMes(ano: number, mes: number): (Date | null)[] {
  const primeiro = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const vazios: null[] = Array<null>(primeiro.getDay()).fill(null);
  const dias = Array.from({ length: totalDias }, (_, i) => new Date(ano, mes, i + 1));
  return [...vazios, ...dias];
}

/** Ano e mês (0-11) de uma âncora `aaaa-mm` ou `aaaa-mm-dd`, sem passar por `Date`. */
function lerAncora(iso: string): { ano: number; mes: number } {
  const [ano, mes] = iso.split('-').map(Number);
  return { ano, mes: mes - 1 };
}

function Calendario<V>({
  modo,
  valor,
  aoMudar,
  tom = 'auto',
  prefixo,
  minimo,
  maximo,
  desabilitado = false,
  className = '',
  alinhamento = 'esquerda',
  id,
}: CalendarioProps<V>) {
  const [aberto, setAberto] = useState(false);
  /** Primeira ponta de uma seleção que ainda não fechou. Só o `modoIntervalo` usa. */
  const [parcial, setParcial] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [visivel, setVisivel] = useState(() => lerAncora(modo.ancora(valor)));
  const containerRef = useRef<HTMLDivElement>(null);
  const estilo = TONS[tom];

  const fechar = () => {
    setAberto(false);
    setParcial(null);
    setSobre(null);
  };

  useEffect(() => {
    if (!aberto) return;
    const cliqueFora = (evento: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) fechar();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fechar();
    };
    document.addEventListener('mousedown', cliqueFora);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', cliqueFora);
      document.removeEventListener('keydown', tecla);
    };
  }, [aberto]);

  const alternar = () => {
    if (desabilitado) return;
    if (!aberto) setVisivel(lerAncora(modo.ancora(valor)));
    setAberto(!aberto);
  };

  const clicar = (celula: string) => {
    const selecao = modo.selecionar(celula, parcial);
    if (selecao.tipo === 'parcial') {
      setParcial(selecao.ancora);
      return;
    }
    aoMudar(selecao.valor);
    fechar();
  };

  const irParaHoje = () => {
    const novo = modo.hoje();
    aoMudar(novo);
    setVisivel(lerAncora(modo.ancora(novo)));
    fechar();
  };

  /** Passo das setas: mês na grade de dias, ano na de meses. */
  const navegar = (passo: number) =>
    setVisivel(({ ano, mes }) =>
      modo.grade === 'dias'
        ? lerAncora(paraMesLocal(new Date(ano, mes + passo, 1)))
        : { ano: ano + passo, mes }
    );

  /** Célula fora de `minimo`/`maximo`. Compara na granularidade da própria grade. */
  const bloqueada = (celula: string) =>
    (minimo !== undefined && celula < minimo.slice(0, celula.length)) ||
    (maximo !== undefined && celula > maximo.slice(0, celula.length));

  const pintado = modo.intervaloPintado(valor, parcial, sobre);
  const hojeCelula = modo.grade === 'dias' ? hojeIso() : paraMesLocal(new Date());
  const dica = modo.dica(parcial);

  const classeCelula = (celula: string, ehBloqueada: boolean) => {
    if (ehBloqueada) return estilo.celulaBloqueada;
    if (celula === pintado.inicio || celula === pintado.fim) return CELULA_EXTREMO;
    if (celula >= pintado.inicio && celula <= pintado.fim) return CELULA_DENTRO;
    return `${estilo.celulaLivre}${celula === hojeCelula ? ` ${CELULA_HOJE}` : ''}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={alternar}
        disabled={desabilitado}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${estilo.gatilho} ${className}`}
      >
        <Calendar size={16} className={estilo.icone} />
        {prefixo !== undefined && <span className={estilo.prefixo}>{prefixo}:</span>}
        <span className={`font-semibold ${estilo.valor}`}>{modo.rotulo(valor)}</span>
        <ChevronDown
          size={14}
          className={`${estilo.icone} ml-1 transition-transform ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {aberto && (
        <div
          role="dialog"
          className={`absolute top-full mt-1 w-72 border rounded-lg shadow-lg z-50 p-3 ${estilo.painel} ${alinhamento === 'direita' ? 'right-0' : 'left-0'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => navegar(-1)}
              aria-label={modo.grade === 'dias' ? 'Mês anterior' : 'Ano anterior'}
              className={`p-1.5 rounded-md transition-colors ${estilo.seta}`}
            >
              <ChevronLeft size={16} />
            </button>
            <span className={`text-sm font-semibold ${estilo.titulo}`}>
              {modo.grade === 'dias' ? `${MESES[visivel.mes]} ${visivel.ano}` : visivel.ano}
            </span>
            <button
              type="button"
              onClick={() => navegar(1)}
              aria-label={modo.grade === 'dias' ? 'Próximo mês' : 'Próximo ano'}
              className={`p-1.5 rounded-md transition-colors ${estilo.seta}`}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {modo.grade === 'dias' ? (
            <>
              <div className="grid grid-cols-7 gap-y-1 mb-1">
                {DIAS_SEMANA.map((dia, i) => (
                  <span key={i} className={`text-center text-[11px] font-medium ${estilo.diaSemana}`}>
                    {dia}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setSobre(null)}>
                {gradeDoMes(visivel.ano, visivel.mes).map((data, i) => {
                  if (data === null) return <span key={`vazio-${i}`} />;
                  const celula = paraIsoLocal(data);
                  const ehBloqueada = bloqueada(celula);
                  return (
                    <button
                      key={celula}
                      type="button"
                      disabled={ehBloqueada}
                      onClick={() => clicar(celula)}
                      onMouseEnter={() => setSobre(celula)}
                      className={`h-8 text-xs rounded-md transition-colors ${classeCelula(celula, ehBloqueada)}`}
                    >
                      {data.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {MESES_CURTOS.map((nome, i) => {
                const celula = `${visivel.ano}-${String(i + 1).padStart(2, '0')}`;
                const ehBloqueada = bloqueada(celula);
                return (
                  <button
                    key={celula}
                    type="button"
                    disabled={ehBloqueada}
                    onClick={() => clicar(celula)}
                    className={`h-9 text-xs rounded-md transition-colors ${classeCelula(celula, ehBloqueada)}`}
                  >
                    {nome}
                  </button>
                );
              })}
            </div>
          )}

          <div className={`flex items-center justify-between mt-3 pt-3 border-t ${estilo.rodape}`}>
            <span className={`text-[11px] ${estilo.dica}`}>{dica}</span>
            <button
              type="button"
              onClick={irParaHoje}
              className="text-xs font-medium text-blue-500 hover:underline"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendario;
