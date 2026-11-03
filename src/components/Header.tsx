import React from 'react';
import { Language, UserRole } from '../types';
import { translations } from '../translations';
import { Smartphone, Globe, Shield, User, Bell, BellRing } from 'lucide-react';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  role: UserRole;
  onSwitchRole: (role: UserRole) => void;
  onOpenApkModal: () => void;
  notificationsEnabled: boolean;
  onRequestNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  role,
  onSwitchRole,
  onOpenApkModal,
  notificationsEnabled,
  onRequestNotifications
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-pink-300 shadow-xs shrink-0 bg-pink-50 flex items-center justify-center">
            <img
              src="/src/assets/images/tailor_shop_emblem_1793686503000.jpg"
              alt="SK Ladies Tailor Logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                // fallback if image fails
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-extrabold text-lg sm:text-xl text-pink-700 tracking-tight whitespace-nowrap">
                {lang === 'mr' ? 'एस. के. लेडीज टेलर' : 'SK Ladies Tailor'}
              </span>
              <span className="hidden sm:inline-block text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                {lang === 'mr' ? 'पंढरपूर' : 'Pandharpur'}
              </span>
            </div>
            <p className="text-[11px] text-pink-900/60 hidden md:block truncate max-w-xs">
              {t.shopTagline}
            </p>
          </div>
        </div>

        {/* Zone 2: Role Switcher & Push Notification Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Push Notification button */}
          <button
            onClick={onRequestNotifications}
            title={notificationsEnabled ? t.pushAlertsEnabled : t.enablePushAlerts}
            className={`p-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
              notificationsEnabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
            }`}
          >
            {notificationsEnabled ? (
              <BellRing className="w-4 h-4 text-emerald-600" />
            ) : (
              <Bell className="w-4 h-4 text-pink-600" />
            )}
            <span className="hidden lg:inline text-[11px]">
              {notificationsEnabled ? t.pushAlertsEnabled : t.enablePushAlerts}
            </span>
          </button>

          {/* Role Toggle */}
          <div className="bg-pink-50/80 p-1 rounded-xl border border-pink-200 flex items-center gap-1">
            <button
              onClick={() => onSwitchRole('customer')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                role === 'customer'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-pink-900/70 hover:text-pink-900 hover:bg-white/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{lang === 'mr' ? 'ग्राहक' : 'Customer'}</span>
            </button>
            <button
              onClick={() => onSwitchRole('admin')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                role === 'admin'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-pink-900/70 hover:text-pink-900 hover:bg-white/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{lang === 'mr' ? 'मालकीण (Admin)' : 'Admin (Owner)'}</span>
            </button>
          </div>
        </div>

        {/* Zone 3: Actions (Language Switch & APK Export) */}
        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-200 bg-white hover:bg-pink-50 text-pink-700 font-semibold text-xs transition-colors shadow-2xs whitespace-nowrap"
            title="Switch Language / भाषा बदला"
          >
            <Globe className="w-3.5 h-3.5 text-pink-600" />
            <span>{t.switchLanguage}</span>
          </button>

          {/* Android APK Modal Trigger */}
          <button
            onClick={onOpenApkModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-700 hover:bg-pink-800 text-white font-medium text-xs transition-colors shadow-2xs whitespace-nowrap"
            title="Install App / APK"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t.androidApp}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
