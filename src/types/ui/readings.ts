/**
 * Tipos relacionados a Leituras de Bombas e Bicos.
 */

/**
 * Leitura individual de um bico.
 */
export interface ReadingNozzle {
    id: string;
    number: string;
    product: string;
    productColorClass: string;
    tank: string;
    initialReading: number;
    price: number;
}

/**
 * Bomba de combustível contendo seus bicos.
 */
export interface ReadingPump {
    id: string;
    name: string;
    nozzles: ReadingNozzle[];
}
