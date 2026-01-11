import React from 'react';
import { Calendar } from 'lucide-react';

interface FiltroDataProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
}

const FiltroData: React.FC<FiltroDataProps> = ({ selectedDate, onDateChange }) => {
    return (
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <Calendar className="text-blue-600" size={20} />
            <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 font-bold"
            />
        </div>
    );
};

export default FiltroData;
