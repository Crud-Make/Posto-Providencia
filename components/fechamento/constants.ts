export const FUEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
   'GC': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
   'GA': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
   'ET': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
   'S10': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
   'DIESEL': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
};

export const FUEL_CHART_COLORS: Record<string, string> = {
   'GC': '#EF4444', // red-500
   'GA': '#3B82F6', // blue-500
   'ET': '#22C55E', // green-500
   'S10': '#EAB308', // yellow-500
   'DIESEL': '#F59E0B', // amber-500
};

export const PAYMENT_CHART_COLORS = [
   '#3B82F6', // blue-500
   '#8B5CF6', // violet-500
   '#EC4899', // pink-500
   '#F97316', // orange-500
   '#10B981', // emerald-500
   '#6366F1', // indigo-500
   '#14B8A6', // teal-500
];

export const DEFAULT_TURNOS = [
   { id: 1, nome: 'Manhã', horario_inicio: '06:00', horario_fim: '14:00' },
   { id: 2, nome: 'Tarde', horario_inicio: '14:00', horario_fim: '22:00' },
   { id: 3, nome: 'Noite', horario_inicio: '22:00', horario_fim: '06:00' },
];
