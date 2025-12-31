import React from 'react';
import { AlertOctagon, AlertTriangle } from 'lucide-react';

interface FuelTankProps {
    productName: string;
    code: string;
    currentVolume: number;
    capacity: number;
    color: 'green' | 'blue' | 'yellow' | 'gray' | 'red';
    status: 'OK' | 'BAIXO' | 'CRÍTICO';
    daysRemaining: number;
}

const FuelTank: React.FC<FuelTankProps> = ({
    productName,
    code,
    currentVolume,
    capacity,
    color,
    status,
    daysRemaining,
}) => {
    const percentage = Math.min(100, Math.max(0, (currentVolume / capacity) * 100));

    // Visual configuration based on color
    const colorMap = {
        green: {
            liquid: 'bg-green-500',
            liquidLight: 'bg-green-400',
            border: 'border-green-200',
            text: 'text-green-700',
            bg: 'bg-green-50'
        },
        blue: {
            liquid: 'bg-blue-500',
            liquidLight: 'bg-blue-400',
            border: 'border-blue-200',
            text: 'text-blue-700',
            bg: 'bg-blue-50'
        },
        yellow: {
            liquid: 'bg-yellow-500',
            liquidLight: 'bg-yellow-400',
            border: 'border-yellow-200',
            text: 'text-yellow-700',
            bg: 'bg-yellow-50'
        },
        red: {
            liquid: 'bg-red-500',
            liquidLight: 'bg-red-400',
            border: 'border-red-200',
            text: 'text-red-700',
            bg: 'bg-red-50'
        },
        gray: {
            liquid: 'bg-gray-500',
            liquidLight: 'bg-gray-400',
            border: 'border-gray-200',
            text: 'text-gray-700',
            bg: 'bg-gray-50'
        }
    };

    const theme = colorMap[color];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4 relative overflow-hidden group hover:shadow-md transition-all duration-300">

            {/* Header */}
            <div className="w-full flex justify-between items-start z-10">
                <div>
                    <span className={`inline-block px-2 py-0.5 rounded textxs font-bold mb-1 ${theme.bg} ${theme.text} border ${theme.border}`}>
                        {code}
                    </span>
                    <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{productName}</h3>
                </div>

                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border
                 ${status === 'OK' ? 'bg-[#13ec6d]/10 text-green-700 border-[#13ec6d]/20' : ''}
                 ${status === 'BAIXO' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                 ${status === 'CRÍTICO' ? 'bg-red-100 text-red-700 border-red-200 animate-pulse' : ''}
              `}>
                    <span className={`size-1.5 rounded-full
                   ${status === 'OK' ? 'bg-green-500' : ''}
                   ${status === 'BAIXO' ? 'bg-yellow-500' : ''}
                   ${status === 'CRÍTICO' ? 'bg-red-500' : ''}
                `}></span>
                    {status}
                </span>
            </div>

            {/* Tank Visualization (Bucket Style) */}
            <div className="relative w-32 h-40 mt-2 mb-2">
                {/* Tank Container */}
                <div className="absolute inset-0 border-2 border-gray-200 dark:border-gray-600 rounded-b-3xl rounded-t-lg bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm overflow-hidden z-20">
                    {/* Measurement Lines */}
                    <div className="absolute top-[25%] left-0 w-2 h-[1px] bg-gray-300 dark:bg-gray-500"></div>
                    <div className="absolute top-[50%] left-0 w-3 h-[1px] bg-gray-300 dark:bg-gray-500"></div>
                    <div className="absolute top-[75%] left-0 w-2 h-[1px] bg-gray-300 dark:bg-gray-500"></div>

                    <div className="absolute top-[25%] right-0 w-2 h-[1px] bg-gray-300 dark:bg-gray-500"></div>
                    <div className="absolute top-[50%] right-0 w-3 h-[1px] bg-gray-300 dark:bg-gray-500"></div>
                    <div className="absolute top-[75%] right-0 w-2 h-[1px] bg-gray-300 dark:bg-gray-500"></div>
                </div>

                {/* Liquid Fill */}
                <div
                    className={`absolute bottom-0 left-0 right-0 rounded-b-[22px] transition-all duration-1000 ease-in-out ${theme.liquid} opacity-90 z-10`}
                    style={{ height: `${percentage}%` }}
                >
                    {/* Surface Reflection/Highlight */}
                    <div className="absolute top-0 left-0 right-0 h-2 bg-white/20"></div>

                    {/* Bubbles Animation (Visual Flair) */}
                    <div className="absolute bottom-2 left-1/4 w-1 h-1 bg-white/40 rounded-full animate-[rise_2s_infinite]"></div>
                    <div className="absolute bottom-4 left-3/4 w-1.5 h-1.5 bg-white/30 rounded-full animate-[rise_3s_infinite_0.5s]"></div>
                </div>

                {/* Glass Reflection Overlay */}
                <div className="absolute inset-0 rounded-b-3xl rounded-t-lg bg-gradient-to-br from-white/40 to-transparent pointer-events-none z-30"></div>

                {/* Percentage Label */}
                <div className="absolute inset-0 flex items-center justify-center z-40">
                    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-600">
                        <span className="text-xl font-black text-gray-900 dark:text-white">{Math.round(percentage)}%</span>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="w-full grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold mb-0.5">Volume</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{currentVolume.toLocaleString('pt-BR')} L</p>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <p className="text-[10px] uppercase text-gray-500 dark:text-gray-400 font-bold mb-0.5">Previsão</p>
                    <p className={`text-sm font-bold ${daysRemaining < 3 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                        {daysRemaining} dias
                    </p>
                </div>
            </div>

        </div>
    );
};

export default React.memo(FuelTank);
