/**
 * Seletor de período do Dashboard — calendário com escolha de intervalo.
 *
 * @remarks
 * Substitui os atalhos fixos (Hoje/Ontem/Última Semana/Este Mês) que existiam antes.
 * As conversões de data vivem em `utils/periodo` — ISO local, nunca `toISOString()`.
 */
import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { paraIsoLocal, deIsoLocal, hojeIso, formatarPeriodo, type Periodo } from '../../../utils/periodo';

interface DateRangePickerProps {
  periodo: Periodo;
  onChange: (periodo: Periodo) => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
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

function DateRangePicker({ periodo, onChange }: DateRangePickerProps) {
  const [aberto, setAberto] = useState(false);
  /** Início de uma seleção em andamento: o usuário já clicou uma ponta e falta a outra. */
  const [ancora, setAncora] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [mesVisivel, setMesVisivel] = useState(() => {
    const d = deIsoLocal(periodo.fim);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cliqueFora = (evento: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
        setAncora(null);
      }
    };
    document.addEventListener('mousedown', cliqueFora);
    return () => document.removeEventListener('mousedown', cliqueFora);
  }, []);

  const selecionar = (iso: string) => {
    if (ancora === null) {
      setAncora(iso);
      return;
    }
    // Segunda ponta: ordena, aplica e fecha. Clicar duas vezes no mesmo dia = dia único.
    const [inicio, fim] = ancora <= iso ? [ancora, iso] : [iso, ancora];
    onChange({ inicio, fim });
    setAncora(null);
    setSobre(null);
    setAberto(false);
  };

  const irParaHoje = () => {
    const hoje = hojeIso();
    onChange({ inicio: hoje, fim: hoje });
    setMesVisivel(deIsoLocal(hoje));
    setAncora(null);
    setAberto(false);
  };

  const mudarMes = (passo: number) =>
    setMesVisivel(atual => new Date(atual.getFullYear(), atual.getMonth() + passo, 1));

  /** Extremos do que está pintado agora: a seleção aplicada ou a que está em andamento. */
  const previa: Periodo =
    ancora !== null && sobre !== null
      ? (ancora <= sobre ? { inicio: ancora, fim: sobre } : { inicio: sobre, fim: ancora })
      : ancora !== null
        ? { inicio: ancora, fim: ancora }
        : periodo;

  const dias = gradeDoMes(mesVisivel.getFullYear(), mesVisivel.getMonth());
  const hoje = hojeIso();

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        <Calendar size={16} className="text-gray-400" />
        <span className="text-gray-500 dark:text-gray-400">Data:</span>
        <span className="font-semibold text-gray-900 dark:text-white">{formatarPeriodo(periodo)}</span>
        <ChevronDown size={14} className={`text-gray-400 ml-2 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </div>

      {aberto && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => mudarMes(-1)}
              aria-label="Mês anterior"
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MESES[mesVisivel.getMonth()]} {mesVisivel.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => mudarMes(1)}
              aria-label="Próximo mês"
              className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 mb-1">
            {DIAS_SEMANA.map((dia, i) => (
              <span key={i} className="text-center text-[11px] font-medium text-gray-400 dark:text-gray-500">
                {dia}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setSobre(null)}>
            {dias.map((data, i) => {
              if (data === null) return <span key={`vazio-${i}`} />;
              const iso = paraIsoLocal(data);
              const dentro = iso >= previa.inicio && iso <= previa.fim;
              const extremo = iso === previa.inicio || iso === previa.fim;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selecionar(iso)}
                  onMouseEnter={() => setSobre(iso)}
                  className={`h-8 text-xs rounded-md transition-colors ${
                    extremo
                      ? 'bg-blue-600 text-white font-semibold'
                      : dentro
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                  } ${iso === hoje && !extremo ? 'ring-1 ring-inset ring-blue-400' : ''}`}
                >
                  {data.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              {ancora === null ? 'Clique no dia inicial' : 'Agora clique no dia final'}
            </span>
            <button
              type="button"
              onClick={irParaHoje}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
