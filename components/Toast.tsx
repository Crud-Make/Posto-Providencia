import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, AlertOctagon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    onClose: () => void;
}

const toastStyles: Record<ToastType, { bg: string; icon: React.ReactNode; iconBg: string }> = {
    success: {
        bg: 'bg-green-50 border-green-200',
        iconBg: 'bg-green-100',
        icon: <CheckCircle2 size={20} className="text-green-600" />
    },
    error: {
        bg: 'bg-red-50 border-red-200',
        iconBg: 'bg-red-100',
        icon: <AlertOctagon size={20} className="text-red-600" />
    },
    warning: {
        bg: 'bg-yellow-50 border-yellow-200',
        iconBg: 'bg-yellow-100',
        icon: <AlertTriangle size={20} className="text-yellow-600" />
    },
    info: {
        bg: 'bg-blue-50 border-blue-200',
        iconBg: 'bg-blue-100',
        icon: <Info size={20} className="text-blue-600" />
    }
};

const Toast: React.FC<ToastProps> = ({ type, title, message, duration = 5000, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));

        // Auto close timer
        const timer = setTimeout(() => {
            setIsLeaving(true);
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleClose = () => {
        setIsLeaving(true);
        setTimeout(onClose, 300);
    };

    const styles = toastStyles[type];

    return (
        <div
            className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
        >
            <div className={`${styles.bg} border rounded-xl p-4 shadow-xl shadow-black/5`}>
                <div className="flex items-start gap-3">
                    <div className={`${styles.iconBg} p-2 rounded-lg flex-shrink-0`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1 pt-0.5">
                        <p className="font-bold text-gray-900 text-sm">{title}</p>
                        {message && (
                            <p className="text-gray-600 text-xs mt-1 leading-relaxed">{message}</p>
                        )}
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 rounded-lg hover:bg-black/5 transition-colors flex-shrink-0"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-black/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-current opacity-30 rounded-full"
                        style={{
                            animation: `shrink ${duration}ms linear forwards`,
                        }}
                    />
                </div>
            </div>

            <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
        </div>
    );
};

// Toast Container for managing multiple toasts
interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContainerProps {
    toasts: ToastItem[];
    onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-50 space-y-3">
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    style={{ transform: `translateY(${index * 10}px)` }}
                >
                    <Toast
                        type={toast.type}
                        title={toast.title}
                        message={toast.message}
                        duration={toast.duration}
                        onClose={() => onRemove(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
};

// Hook for managing toasts
export const useToast = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = (toast: Omit<ToastItem, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { ...toast, id }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const success = (title: string, message?: string) => addToast({ type: 'success', title, message });
    const error = (title: string, message?: string) => addToast({ type: 'error', title, message });
    const warning = (title: string, message?: string) => addToast({ type: 'warning', title, message });
    const info = (title: string, message?: string) => addToast({ type: 'info', title, message });

    return { toasts, addToast, removeToast, success, error, warning, info };
};

export default Toast;
