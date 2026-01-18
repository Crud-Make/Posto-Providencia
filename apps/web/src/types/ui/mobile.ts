/**
 * Tipos relacionados ao App Mobile.
 */

/**
 * Resposta de autenticação mobile.
 */
export interface MobileAuthResponse {
    token: string;
    user: {
        id: string;
        name: string;
        role: 'admin' | 'manager' | 'attendant';
        avatar: string;
    };
}

/**
 * Notificação push para o app mobile.
 */
export interface MobileNotification {
    id: string;
    title: string;
    description: string;
    timestamp: string;
    read: boolean;
    type: 'alert' | 'info' | 'success';
}

/**
 * Dados da home do app mobile.
 */
export interface MobileHomeData {
    totalSalesToday: number;
    pendingClosings: number;
    alertsCount: number;
    recentNotifications: MobileNotification[];
    quickStats: {
        label: string;
        value: string;
        trend: 'up' | 'down' | 'neutral';
    }[];
}
