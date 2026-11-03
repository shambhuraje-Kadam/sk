/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Language, UserRole, ShopInfo, Order } from './types';
import { Header } from './components/Header';
import { CustomerPortal } from './components/CustomerPortal';
import { AdminPortal } from './components/AdminPortal';
import { InvoiceModal } from './components/InvoiceModal';
import { ApkExportModal } from './components/ApkExportModal';
import { NotificationToast, PushNotificationData } from './components/NotificationToast';
import { translations } from './translations';
import { Scissors, Heart, Phone, MapPin, Sparkles } from 'lucide-react';

const defaultShopInfo: ShopInfo = {
  name: 'SK Ladies Tailor',
  marathiName: 'एस. के. लेडीज टेलर',
  tagline: 'Bespoke Blouse, Dress & Traditional Stitching',
  ownerName: 'Sayali Kadam',
  phone: '7385659762',
  address: 'Bhakti marg vistpit nagar, Pandharpur',
  upiId: '7385659762@axl'
};

export default function App() {
  const [lang, setLang] = useState<Language>('mr');
  const [role, setRole] = useState<UserRole>('customer');
  const [shopInfo, setShopInfo] = useState<ShopInfo>(defaultShopInfo);

  // Modals state
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currentNotification, setCurrentNotification] = useState<PushNotificationData | null>(null);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);

  const t = translations[lang];

  // Fetch shop information
  useEffect(() => {
    fetch('/api/shop-info')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.shopInfo) {
          setShopInfo(data.shopInfo);
        }
      })
      .catch((e) => console.error('Error fetching shop info:', e));
  }, []);

  // Listen for PWA BeforeInstallPromptEvent
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Play synthesized audio chime for notification
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {
      // AudioContext not allowed without interaction
    }
  };

  // Request Notification Permission
  const handleRequestNotifications = async () => {
    if (!('Notification' in window)) {
      alert(lang === 'mr' ? 'या ब्राउझरमध्ये नोटिफिकेशन्स सपोर्ट उपलब्ध नाही.' : 'Notifications not supported in this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        playNotificationSound();
        new Notification(lang === 'mr' ? 'एस. के. लेडीज टेलर' : 'SK Ladies Tailor', {
          body: lang === 'mr' ? 'पुश नोटिफिकेशन्स सक्रिय करण्यात आले आहेत!' : 'Push notifications are now enabled!',
          icon: '/src/assets/images/tailor_shop_emblem_1793686503000.jpg'
        });
      }
    } catch (e) {
      console.error('Error requesting notification permission:', e);
    }
  };

  // Real-time Push Notifications via SSE
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'push_notification' && data.payload) {
          const notif = data.payload as PushNotificationData;
          setCurrentNotification(notif);
          playNotificationSound();

          // Native browser notification if enabled
          if ('Notification' in window && Notification.permission === 'granted') {
            const title = lang === 'mr' && notif.marathiTitle ? notif.marathiTitle : notif.title;
            const body = lang === 'mr' && notif.marathiBody ? notif.marathiBody : notif.body;
            new Notification(title, {
              body,
              icon: '/src/assets/images/tailor_shop_emblem_1793686503000.jpg'
            });
          }
        }
      } catch (err) {
        console.error('Error in App SSE event:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [lang]);

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  const handleViewOrder = (orderId: string) => {
    setRole('customer');
    setHighlightOrderId(orderId);
    setTimeout(() => {
      const el = document.getElementById(`order-${orderId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  return (
    <div className="min-h-screen bg-rose-50/30 text-slate-900 flex flex-col selection:bg-pink-200 selection:text-pink-900">
      {/* Top Header */}
      <Header
        lang={lang}
        onToggleLang={() => setLang(lang === 'mr' ? 'en' : 'mr')}
        role={role}
        onSwitchRole={(r) => {
          setRole(r);
          setHighlightOrderId(null);
        }}
        onOpenApkModal={() => setIsApkModalOpen(true)}
        notificationsEnabled={notificationsEnabled}
        onRequestNotifications={handleRequestNotifications}
      />

      {/* Main Content Viewport */}
      <main className="flex-1">
        {role === 'customer' ? (
          <CustomerPortal
            lang={lang}
            shopInfo={shopInfo}
            onOpenInvoice={(ord) => setActiveInvoiceOrder(ord)}
            onRequestNotifications={handleRequestNotifications}
            notificationsEnabled={notificationsEnabled}
            highlightOrderId={highlightOrderId}
          />
        ) : (
          <AdminPortal
            lang={lang}
            shopInfo={shopInfo}
            onOpenInvoice={(ord) => setActiveInvoiceOrder(ord)}
            onOrderUpdated={() => {}}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-pink-100 py-8 px-4 text-xs text-slate-500 mt-12 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
              SK
            </div>
            <div>
              <div className="font-heading font-bold text-slate-800 text-sm">
                {lang === 'mr' ? shopInfo.marathiName : shopInfo.name}
              </div>
              <p className="text-[11px] text-slate-400">
                {shopInfo.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <a
              href={`tel:${shopInfo.phone}`}
              className="hover:text-pink-700 flex items-center gap-1 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-pink-600" />
              <span>+91 {shopInfo.phone}</span>
            </a>
            <button
              onClick={() => setIsApkModalOpen(true)}
              className="hover:text-pink-700 transition-colors"
            >
              {t.androidApp}
            </button>
            <button
              onClick={() => setLang(lang === 'mr' ? 'en' : 'mr')}
              className="text-pink-700 font-bold hover:underline"
            >
              {t.switchLanguage}
            </button>
          </div>
        </div>
      </footer>

      {/* Modals & Live Toasts */}
      <InvoiceModal
        order={activeInvoiceOrder}
        shopInfo={shopInfo}
        lang={lang}
        onClose={() => setActiveInvoiceOrder(null)}
      />

      <ApkExportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
        lang={lang}
        installPrompt={installPrompt}
        onInstallPwa={handleInstallPwa}
      />

      <NotificationToast
        notification={currentNotification}
        lang={lang}
        onDismiss={() => setCurrentNotification(null)}
        onViewOrder={handleViewOrder}
      />
    </div>
  );
}
