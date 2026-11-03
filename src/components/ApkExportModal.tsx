import React from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { X, Smartphone, Download, CheckCircle2, QrCode, Sparkles } from 'lucide-react';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  installPrompt: any;
  onInstallPwa: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({
  isOpen,
  onClose,
  lang,
  installPrompt,
  onInstallPwa
}) => {
  const t = translations[lang];

  if (!isOpen) return null;

  const downloadManifestFile = () => {
    const manifestData = {
      short_name: 'SK Tailor',
      name: 'SK Ladies Tailor | एस. के. लेडीज टेलर',
      icons: [
        {
          src: '/src/assets/images/tailor_shop_emblem_1793686503000.jpg',
          type: 'image/jpeg',
          sizes: '512x512',
          purpose: 'any maskable'
        }
      ],
      start_url: '/',
      background_color: '#fff1f2',
      theme_color: '#e11d48',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      description: 'Business management and customer order tracking for SK Ladies Tailor.'
    };

    const blob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sk_ladies_tailor_manifest.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-pink-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-lg sm:text-xl text-slate-900">
              {t.apkModalTitle}
            </h3>
            <p className="text-xs text-pink-700 font-medium">
              {lang === 'mr' ? 'अँड्रॉइड फोन आणि टॅबलेटसाठी' : 'For Android Phones & Tablets'}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {t.apkDescription}
        </p>

        {/* Feature Highlights */}
        <div className="bg-pink-50/60 rounded-2xl p-4 border border-pink-100 mb-6 space-y-2.5">
          <div className="text-xs font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span>{lang === 'mr' ? 'ॲपची वैशिष्ट्ये' : 'App Highlights'}</span>
          </div>
          {t.apkFeatures.map((feat, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {installPrompt ? (
            <button
              onClick={() => {
                onInstallPwa();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-pink-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.installAsPwa}</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              <strong>{lang === 'mr' ? 'मोबाईल क्रोममध्ये इन्स्टॉल करण्यासाठी:' : 'To Install in Mobile Chrome:'}</strong>{' '}
              {lang === 'mr'
                ? 'ब्राउझरच्या तीन टिंबांवर (⋮) क्लिक करून "Add to Home screen" किंवा "Install app" निवडा.'
                : 'Tap the 3 dots (⋮) in Chrome and select "Add to Home screen" or "Install app".'}
            </div>
          )}

          <button
            onClick={downloadManifestFile}
            className="w-full py-3 px-4 rounded-xl border border-pink-200 bg-white hover:bg-pink-50 text-pink-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
          >
            <Download className="w-4 h-4 text-pink-600" />
            <span>{t.downloadManifest}</span>
          </button>
        </div>

        {/* QR or PWABuilder Instructions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-slate-400" />
            <span>{lang === 'mr' ? 'PWA & TWA APK रेडी' : 'PWA & TWA Ready Architecture'}</span>
          </div>
          <span className="font-mono">v1.2.0 • Android</span>
        </div>
      </div>
    </div>
  );
};
