import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, User, Save, RefreshCw } from 'lucide-react';
import { frentistaService, escalaService } from '../services/api';

interface Frentista {
    id: number;
    nome: string;
}

interface Escala {
    id: number;
    frentista_id: number;
    data: string;
    tipo: 'FOLGA' | 'TRABALHO';
    observacao?: string;
}

const ScheduleManagementScreen: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [frentistas, setFrentistas] = useState<Frentista[]>([]);
    const [escalas, setEscalas] = useState<Escala[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [frentistasData, escalasData] = await Promise.all([
                frentistaService.getAll(),
                escalaService.getByMonth(currentDate.getMonth() + 1, currentDate.getFullYear())
            ]);
            setFrentistas(frentistasData.filter(f => f.ativo));
            setEscalas(escalasData);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleCellClick = async (frentistaId: number, day: number) => {
        // Toggle Folga
        // Check if exists
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
        const existing = escalas.find(e => e.frentista_id === frentistaId && e.data === dateStr);

        try {
            if (existing) {
                // Remove (back to Trabalho default) if it was Folga?
                // Or toggle between types. Assuming default is Work.
                // If exists (Folga), delete it.
                await escalaService.delete(existing.id);
                setEscalas(prev => prev.filter(e => e.id !== existing.id));
            } else {
                // Create Folga
                const newEscala = await escalaService.create({
                    frentista_id: frentistaId,
                    data: dateStr,
                    tipo: 'FOLGA'
                });
                setEscalas(prev => [...prev, newEscala]);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar escala');
        }
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const days = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    const getDayLabel = (day: number) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return weekDays[d.getDay()];
    };

    const isWeekend = (day: number) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay();
        return d === 0 || d === 6;
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar className="text-blue-600" />
                        Gestão de Escala e Folgas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Clique nos dias para definir as folgas dos frentistas.</p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-lg min-w-[150px] text-center capitalize">
                        {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="p-4 min-w-[200px] sticky left-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10">Frentista</th>
                            {days.map(day => (
                                <th key={day} className={`p-2 text-center min-w-[40px] border-l border-gray-100 dark:border-gray-700 ${isWeekend(day) ? 'bg-gray-100/50 dark:bg-gray-800' : ''}`}>
                                    <div className="font-bold">{day}</div>
                                    <div className="text-xs font-normal">{getDayLabel(day)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={days.length + 1} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                        ) : (
                            frentistas.map(frentista => (
                                <tr key={frentista.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="p-4 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-10 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                                            {frentista.nome.charAt(0)}
                                        </div>
                                        {frentista.nome}
                                    </td>
                                    {days.map(day => {
                                        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
                                        const escala = escalas.find(e => e.frentista_id === frentista.id && e.data === dateStr);
                                        const isFolga = escala?.tipo === 'FOLGA';

                                        return (
                                            <td
                                                key={day}
                                                onClick={() => handleCellClick(frentista.id, day)}
                                                className={`p-1 border-l border-gray-100 dark:border-gray-700 cursor-pointer text-center relative group ${isWeekend(day) ? 'bg-gray-50/50' : ''}`}
                                            >
                                                <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isFolga
                                                        ? 'bg-red-100 text-red-600 font-bold border-2 border-red-200'
                                                        : 'hover:bg-blue-50 text-transparent hover:text-blue-300'
                                                    }`}>
                                                    {isFolga ? 'F' : '•'}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-red-100 border-2 border-red-200 flex items-center justify-center text-red-600 font-bold text-xs">F</div>
                    <span>Folga</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-300 text-xs">•</div>
                    <span>Trabalho (Padrão)</span>
                </div>
            </div>
        </div>
    );
};

export default ScheduleManagementScreen;
