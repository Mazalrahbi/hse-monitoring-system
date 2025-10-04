'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    const duration = toast.duration || 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
    
    return id;
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 200); // Match animation duration
  };

  const getToastStyles = () => {
    const base = 'flex items-start p-4 rounded-lg shadow-lg border-l-4 backdrop-blur-sm';
    
    switch (toast.type) {
      case 'success':
        return `${base} bg-green-50/95 border-green-500 text-green-900`;
      case 'error':
        return `${base} bg-red-50/95 border-red-500 text-red-900`;
      case 'warning':
        return `${base} bg-yellow-50/95 border-yellow-500 text-yellow-900`;
      case 'info':
      default:
        return `${base} bg-blue-50/95 border-blue-500 text-blue-900`;
    }
  };

  const getIcon = () => {
    const iconClass = "h-5 w-5 flex-shrink-0 mt-0.5";
    
    switch (toast.type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-600`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-600`} />;
      case 'info':
      default:
        return <Info className={`${iconClass} text-blue-600`} />;
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isLeaving 
          ? 'translate-x-full opacity-0 scale-95' 
          : 'translate-x-0 opacity-100 scale-100 animate-slide-in-right'
        }
      `}
    >
      <div className={getToastStyles()}>
        <div className="mr-3">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold leading-tight">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="mt-1 text-sm opacity-90 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>
        
        <button
          onClick={handleClose}
          className="ml-2 flex-shrink-0 rounded-md p-1 hover:bg-black/10 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Add the animation to global CSS
const toastAnimations = `
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in-right {
  animation: slide-in-right 0.3s ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = toastAnimations;
  document.head.appendChild(styleElement);
}
