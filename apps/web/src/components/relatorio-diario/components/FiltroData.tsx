import React from 'react';
import { Calendario, modoDia } from '@shared/ui/calendario';

interface FiltroDataProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
}

const FiltroData: React.FC<FiltroDataProps> = ({ selectedDate, onDateChange }) => (
    <Calendario modo={modoDia} valor={selectedDate} aoMudar={onDateChange} prefixo="Data" />
);

export default FiltroData;
