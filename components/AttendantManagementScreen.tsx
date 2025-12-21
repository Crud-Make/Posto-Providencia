
import React, { useState, useEffect } from 'react';
import {
   Search,
   Filter,
   UserPlus,
   Sun,
   Moon,
   Sunset,
   X,
   ShieldCheck,
   Edit,
   Trash2,
   ChevronRight,
   User,
   Loader2,
   Mail
} from 'lucide-react';
import { fetchAttendantsData, frentistaService } from '../services/api';
import { supabase } from '../services/supabase';
import { AttendantProfile, AttendantHistoryEntry } from '../types';

const AttendantManagementScreen: React.FC = () => {
   const [loading, setLoading] = useState(true);
   const [attendantsList, setAttendantsList] = useState<AttendantProfile[]>([]);
   const [attendantHistory, setAttendantHistory] = useState<AttendantHistoryEntry[]>([]);

   const [selectedAttendantId, setSelectedAttendantId] = useState<string | null>(null);
   const [searchTerm, setSearchTerm] = useState('');
   const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Ativo');

   const loadData = async () => {
      try {
         const data = await fetchAttendantsData();
         setAttendantsList(data.list);
         setAttendantHistory(data.history);
      } catch (error) {
         console.error("Failed to fetch attendants", error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      loadData();

      const subscription = supabase
         .channel('frentistas_changes')
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Frentista' },
            () => loadData()
         )
         .subscribe();

      return () => {
         subscription.unsubscribe();
      };
   }, []);

   const handleDeleteAttendant = async () => {
      if (!selectedAttendantId) return;

      if (window.confirm('Tem certeza que deseja excluir este frentista?')) {
         try {
            setLoading(true);
            await frentistaService.delete(Number(selectedAttendantId));
            await loadData();
            setSelectedAttendantId(null);
         } catch (error) {
            console.error("Failed to delete attendant", error);
            alert('Erro ao excluir frentista. Tente novamente.');
            setLoading(false);
         }
      }
   };

   const selectedAttendant = attendantsList.find(a => a.id === selectedAttendantId);

   // Filter logic
   const filteredList = attendantsList.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         a.phone.includes(searchTerm);
      const matchesStatus = statusFilter === 'Todos' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
   });

   const getShiftIcon = (shift: string) => {
      switch (shift) {
         case 'Manhã': return <Sun size={14} className="text-yellow-600" />;
         case 'Tarde': return <Sunset size={14} className="text-orange-600" />;
         case 'Noite': return <Moon size={14} className="text-blue-600" />;
         default: return <Sun size={14} />;
      }
   };

   if (loading) {
      return (
         <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] w-full text-blue-600">
            <Loader2 size={48} className="animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Carregando equipe...</p>
         </div>
      );
   }

   return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-64px)] overflow-hidden flex flex-col animate-in fade-in duration-500">
         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
               <h1 className="text-3xl font-bold text-gray-900">Gestão de Frentistas</h1>
               <p className="text-gray-500 mt-1">Gerencie sua equipe, visualize históricos e monitore divergências de caixa.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30">
               <UserPlus size={18} />
               Adicionar Novo Frentista
            </button>
         </div>

         {/* Filters */}
         <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input
                  type="text"
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
               />
            </div>
            <div
               onClick={() => {
                  if (statusFilter === 'Ativo') setStatusFilter('Inativo');
                  else if (statusFilter === 'Inativo') setStatusFilter('Todos');
                  else setStatusFilter('Ativo');
               }}
               className="select-none flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
            >
               <Filter size={16} className="text-gray-400" />
               <span className="text-gray-500">Status:</span>
               <span className="font-semibold text-gray-900">{statusFilter}s</span>
               <ChevronRight size={14} className="text-gray-400 ml-2 rotate-90" />
            </div>
         </div>

         {/* Main Content Area */}
         <div className="flex-1 flex gap-6 overflow-hidden">

            {/* List Column */}
            <div className={`flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${selectedAttendantId ? 'hidden lg:flex' : ''}`}>
               {/* Table Header */}
               <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-5 sm:col-span-4">Frentista</div>
                  <div className="col-span-3 hidden sm:block">Contato</div>
                  <div className="col-span-3 sm:col-span-2">Turno</div>
                  <div className="col-span-4 sm:col-span-3">Status</div>
               </div>

               {/* Table Body */}
               <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                  {filteredList.length === 0 ? (
                     <div className="p-8 text-center text-gray-400 italic">Nenhum frentista encontrado.</div>
                  ) : (
                     filteredList.map((attendant) => (
                        <div
                           key={attendant.id}
                           onClick={() => setSelectedAttendantId(attendant.id)}
                           className={`grid grid-cols-12 gap-4 p-4 items-center cursor-pointer hover:bg-gray-50 transition-colors
                        ${selectedAttendantId === attendant.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}
                        `}
                        >
                           <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${attendant.avatarColorClass}`}>
                                 {attendant.initials}
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-gray-900 leading-tight">{attendant.name}</p>
                                 <p className="text-[10px] text-gray-500 mt-0.5">Desde {attendant.sinceDate}</p>
                              </div>
                           </div>

                           <div className="col-span-3 hidden sm:flex flex-col text-sm text-gray-600">
                              <span>{attendant.phone}</span>
                              <span className="text-xs text-gray-400">Celular</span>
                           </div>

                           <div className="col-span-3 sm:col-span-2">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700">
                                 {getShiftIcon(attendant.shift)}
                                 {attendant.shift}
                              </div>
                           </div>

                           <div className="col-span-4 sm:col-span-3">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold
                            ${attendant.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                        `}>
                                 <span className={`w-1.5 h-1.5 rounded-full ${attendant.status === 'Ativo' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                 {attendant.status}
                              </span>
                           </div>
                        </div>
                     ))
                  )}
               </div>
            </div>

            {/* Detail Panel */}
            {selectedAttendant && (
               <div className="w-full lg:w-[400px] bg-white rounded-xl border border-gray-200 shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 absolute lg:relative inset-0 lg:inset-auto z-10 lg:z-auto">

                  {/* Panel Header */}
                  <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                     <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 block">Detalhes do Frentista</span>
                        <h2 className="text-2xl font-black text-gray-900">{selectedAttendant.name}</h2>
                     </div>
                     <button
                        onClick={() => setSelectedAttendantId(null)}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                     >
                        <X size={20} />
                     </button>
                  </div>

                  {/* Panel Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">

                     {/* Basic Info */}
                     <div className="flex gap-2">
                        <div className="px-3 py-1.5 bg-gray-100 rounded text-xs font-medium text-gray-600 flex items-center gap-2">
                           <User size={14} />
                           CPF: {selectedAttendant.cpf}
                        </div>
                        <div className="px-3 py-1.5 bg-gray-100 rounded text-xs font-medium text-gray-600">
                           Adm: {selectedAttendant.admissionDate}
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <div className="px-3 py-1.5 bg-gray-100 rounded text-xs font-medium text-gray-600 flex items-center gap-2 w-full">
                           <Mail size={14} />
                           {selectedAttendant.email}
                        </div>
                     </div>

                     {/* Metrics Card */}
                     <div className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="text-sm font-medium text-gray-500">Fechamentos com Divergência</h3>
                           <ShieldCheck className="text-green-500" size={20} />
                        </div>
                        <div className="flex items-end gap-3">
                           <span className="text-4xl font-black text-gray-900">{selectedAttendant.divergenceRate}%</span>
                           <span className={`px-2 py-1 rounded text-xs font-bold mb-1
                          ${selectedAttendant.riskLevel === 'Baixo Risco' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                       `}>
                              {selectedAttendant.riskLevel}
                           </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Média dos últimos 30 dias</p>

                        {/* Fake visual bar chart */}
                        <div className="flex items-end gap-1 h-8 mt-4 w-full opacity-50">
                           <div className="flex-1 bg-gray-200 h-1 rounded-t"></div>
                           <div className="flex-1 bg-gray-200 h-2 rounded-t"></div>
                           <div className="flex-1 bg-gray-200 h-1 rounded-t"></div>
                           <div className="flex-1 bg-red-400 h-4 rounded-t"></div>
                           <div className="flex-1 bg-gray-200 h-1 rounded-t"></div>
                           <div className="flex-1 bg-gray-200 h-1 rounded-t"></div>
                           <div className="flex-1 bg-gray-200 h-1 rounded-t"></div>
                        </div>
                     </div>

                     {/* History List */}
                     <div>
                        <div className="flex items-center justify-between mb-3">
                           <h3 className="font-bold text-gray-900 text-sm">Histórico de Fechamentos</h3>
                           <button className="text-xs font-bold text-blue-600 hover:text-blue-700">Ver todos</button>
                        </div>
                        <div className="space-y-3">
                           {attendantHistory.length === 0 ? <p className="text-gray-400 text-xs italic">Nenhum histórico disponível.</p> : attendantHistory.map((history) => (
                              <div key={history.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                 <div>
                                    <p className="text-xs font-bold text-gray-900">{history.date}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">{history.shift}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className={`text-sm font-bold ${history.value < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                       {history.value === 0 ? 'R$ 0,00' : (history.value > 0 ? `+ R$ ${history.value.toFixed(2)}` : `- R$ ${Math.abs(history.value).toFixed(2)}`)}
                                    </p>
                                    <div className="flex items-center justify-end gap-1">
                                       <div className={`w-1.5 h-1.5 rounded-full ${history.status === 'OK' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                       <p className={`text-[10px] font-bold ${history.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>{history.status}</p>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                  </div>

                  {/* Panel Footer */}
                  <div className="p-6 border-t border-gray-100 bg-gray-50/50 space-y-3">
                     <button className="w-full py-2.5 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors">
                        <Edit size={16} />
                        Editar Dados Cadastrais
                     </button>
                     <button
                        onClick={handleDeleteAttendant}
                        className="w-full py-2 flex items-center justify-center gap-2 text-red-600 text-xs font-bold hover:bg-red-50 rounded-lg transition-colors"
                     >
                        <Trash2 size={14} />
                        Excluir Frentista
                     </button>
                  </div>

               </div>
            )}
         </div>
      </div>
   );
};

export default AttendantManagementScreen;
