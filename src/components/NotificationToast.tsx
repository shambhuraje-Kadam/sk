import React, { useEffect } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { Bell, X, CheckCircle2, ArrowRight } from 'lucide-react';

export interface PushNotificationData {
  id: string;
  orderId: string;
  customerPhone: string;
  customerName: string;
  garmentName: string;
  status: string;
  title: string;
  body: string;
  marathiTitle?: string;
  marathiBody?: string;
  timestamp: string;
}

interface NotificationToastProps {
  notification: PushNotificationData | null;
  lang: Language;
  onDismiss: () => void;
  onViewOrder?: (orderId: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  lang,
  onDismiss,
  onViewOrder
}) => {
  const t = translations[lang];

  useEffect(() => {
    if (!notification) return;

    // Auto dismiss after 8 seconds
    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const displayTitle = lang === 'mr' && notification.marathiTitle ? notification.marathiTitle : notification.title;
  const displayBody = lang === 'mr' && notification.marathiBody ? notification.marathiBody : notification.body;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-pink-400 p-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-400 to-pink-600" />
        
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-700 uppercase tracking-wider mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-pink-600" />
              <span>{t.notificationReceived}</span>
            </div>
            <h4 className="font-heading font-bold text-slate-900 text-sm leading-snug">
              {displayTitle}
            </h4>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">
              {displayBody}
            </p>

            <div className="mt-3 flex items-center gap-2">
              {onViewOrder && (
                <button
                  onClick={() => {
                    onViewOrder(notification.orderId);
                    onDismiss();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                >
                  <span>{t.viewUpdatedOrder}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={onDismiss}
                className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
              >
                {t.dismiss}
              </button>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
