/**
 * Dropdown de filtro do Dashboard (data, frentista).
 *
 * Encapsula o estado de abertura e o fechamento por clique fora, que antes
 * viviam duplicados no `useDashboard` e no JSX da tela.
 */
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface FilterDropdownOption<T> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T> {
  Icon: LucideIcon;
  /** Prefixo exibido antes do valor selecionado (ex.: "Data:"). */
  label: string;
  selectedLabel: string;
  selectedValue: T;
  options: FilterDropdownOption<T>[];
  onSelect: (value: T) => void;
  /** Limita a altura da lista com rolagem (usado na lista de frentistas). */
  scrollable?: boolean;
}

function FilterDropdown<T extends string | number | null>({
  Icon,
  label,
  selectedLabel,
  selectedValue,
  options,
  onSelect,
  scrollable = false,
}: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 shadow-sm cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
      >
        <Icon size={16} className="text-gray-400" />
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-white">{selectedLabel}</span>
        <ChevronDown size={14} className={`text-gray-400 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>
      {open && (
        <div className={`absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 ${scrollable ? 'max-h-60 overflow-y-auto' : ''}`}>
          {options.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => { onSelect(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedValue === opt.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
