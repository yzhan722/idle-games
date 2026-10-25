import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState
} from 'react';
import './Toast.css';
import { logger } from '../utils/logger';

export type ToastType = 'success' | 'error' | 'info' | 'reward';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  icon?: string;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType, icon?: string) => void;
  success: (message: string, icon?: string) => void;
  error: (message: string, icon?: string) => void;
  info: (message: string, icon?: string) => void;
  reward: (message: string, icon?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_ICON: Record<ToastType, string> = {
  success: '✅',
  error: '⚠️',
  info: 'ℹ️',
  reward: '🎁'
};

let toastNotificationsEnabled = true;
export function setToastNotificationsEnabled(enabled: boolean) {
  toastNotificationsEnabled = Boolean(enabled);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', icon?: string) => {
      if (!toastNotificationsEnabled && type !== 'error') {
        return;
      }
      const id = ++idRef.current;
      const item: ToastItem = { id, type, message, icon: icon || DEFAULT_ICON[type] };
      setToasts((prev) => [...prev, item]);
      // 自动消失
      const duration = type === 'error' ? 4200 : 3000;
      window.setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const value: ToastContextValue = {
    show,
    success: (m, i) => show(m, 'success', i),
    error: (m, i) => show(m, 'error', i),
    info: (m, i) => show(m, 'info', i),
    reward: (m, i) => show(m, 'reward', i)
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-item toast-${t.type}`}
            onClick={() => remove(t.id)}
          >
            <span className="toast-icon">{t.icon}</span>
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 兜底：无 Provider 时退化为 logger（生产静默），避免崩溃
    return {
      show: (m) => logger.debug('[toast]', m),
      success: (m) => logger.debug('[toast:success]', m),
      error: (m) => logger.warn('[toast:error]', m),
      info: (m) => logger.debug('[toast:info]', m),
      reward: (m) => logger.debug('[toast:reward]', m)
    };
  }
  return ctx;
}
