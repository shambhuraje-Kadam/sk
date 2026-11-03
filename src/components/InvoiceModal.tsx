import React from 'react';
import { Order, Language, ShopInfo } from '../types';
import { translations } from '../translations';
import { X, Printer, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface InvoiceModalProps {
  order: Order | null;
  shopInfo: ShopInfo;
  lang: Language;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  shopInfo,
  lang,
  onClose
}) => {
  const t = translations[lang];

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const textMarathi = `🌸 *${shopInfo.marathiName}* 🌸
ऑर्डर पावती क्र.: ${order.id}
ग्राहक नाव: ${order.customerName}
कपडा: ${order.garmentName}
संख्या: ${order.quantity} नग
नोंदणी तारीख: ${order.orderDate}
डिलिव्हरी तारीख: ${order.deliveryDate}
एकूण दर: ₹${order.totalPrice}
ऍडव्हान्स जमा: ₹${order.advancePayment}
शिल्लक रक्कम: ₹${order.remainingPayment}
स्थिती: ${t.status[order.status] || order.status}
पत्ता: ${shopInfo.address}
संपर्क: ${shopInfo.phone}
धन्यवाद!`;

    const textEnglish = `🌸 *${shopInfo.name}* 🌸
Order Receipt #: ${order.id}
Customer: ${order.customerName}
Garment: ${order.garmentName}
Quantity: ${order.quantity}
Booking Date: ${order.orderDate}
Delivery Date: ${order.deliveryDate}
Total Price: ₹${order.totalPrice}
Advance Paid: ₹${order.advancePayment}
Balance Due: ₹${order.remainingPayment}
Current Status: ${order.status}
Shop Address: ${shopInfo.address}
Phone: ${shopInfo.phone}
Thank you!`;

    const message = encodeURIComponent(lang === 'mr' ? textMarathi : textEnglish);
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const url = `https://wa.me/91${cleanPhone}?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-pink-100 relative max-h-[95vh] overflow-y-auto">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-100 no-print">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-slate-800 text-sm">
              {lang === 'mr' ? 'शिलाई पावती व जॉब शीट' : 'Tailoring Job Sheet & Receipt'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>{t.printReceipt}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.shareWhatsApp}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="pt-6">
          {/* Shop Header */}
          <div className="text-center pb-6 border-b border-dashed border-pink-200">
            <h2 className="font-heading font-extrabold text-2xl text-pink-700 tracking-tight">
              {shopInfo.marathiName}
            </h2>
            <div className="text-sm font-semibold text-slate-800">
              {shopInfo.name}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {shopInfo.address} • फोन: {shopInfo.phone}
            </p>
            {shopInfo.upiId && (
              <p className="text-[11px] font-mono text-pink-600 mt-0.5">
                UPI ID: {shopInfo.upiId}
              </p>
            )}
          </div>

          {/* Order Details & Meta */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-pink-100">
            <div>
              <span className="text-slate-400 block">{t.orderNumber}</span>
              <strong className="font-mono text-sm text-slate-900">{order.id}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">{t.orderDateLabel}</span>
              <strong className="text-slate-900">{order.orderDate}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">{t.deliveryDateLabel}</span>
              <strong className="text-pink-700 text-sm font-bold">{order.deliveryDate}</strong>
            </div>
            <div>
              <span className="text-slate-400 block">{t.currentStage}</span>
              <span className="font-semibold text-pink-600">
                {t.status[order.status] || order.status}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="py-4 border-b border-pink-100 bg-pink-50/40 -mx-6 px-6 sm:-mx-8 sm:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">{t.customerName}: </span>
                <strong className="text-sm text-slate-900">{order.customerName}</strong>
              </div>
              <div>
                <span className="text-slate-500">{t.customerPhone}: </span>
                <strong className="font-mono text-sm text-slate-900">{order.customerPhone}</strong>
              </div>
            </div>
          </div>

          {/* Garment & Stitching Specifications */}
          <div className="py-4 border-b border-pink-100 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{order.garmentName}</h4>
                <div className="text-xs text-slate-500 mt-0.5">
                  {lang === 'mr' ? 'संख्या:' : 'Quantity:'} {order.quantity} {lang === 'mr' ? 'नग' : 'Pcs'}
                  {order.liningIncluded && (
                    <span className="ml-3 text-pink-700 font-medium">
                      ✓ {lang === 'mr' ? 'अस्तर जोडणे (Lining)' : 'With Lining'}
                    </span>
                  )}
                  {order.urgent && (
                    <span className="ml-3 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                      ⚠ URGENT
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">{t.totalBill}</span>
                <span className="font-bold text-slate-900 text-base tabular-nums">
                  ₹{order.totalPrice}
                </span>
              </div>
            </div>

            {/* Design Specifications */}
            {(order.neckDesign || order.sleeveDesign || order.specialInstructions) && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1.5 border border-slate-200/60 mt-3">
                {order.neckDesign && (
                  <div>
                    <span className="font-medium text-slate-500">{t.neckDesign}: </span>
                    <span className="text-slate-800">{order.neckDesign}</span>
                  </div>
                )}
                {order.sleeveDesign && (
                  <div>
                    <span className="font-medium text-slate-500">{t.sleeveDesign}: </span>
                    <span className="text-slate-800">{order.sleeveDesign}</span>
                  </div>
                )}
                {order.specialInstructions && (
                  <div>
                    <span className="font-medium text-slate-500">{t.specialInstructions}: </span>
                    <span className="text-slate-800">{order.specialInstructions}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Measurements Card */}
          {order.measurementsSnapshot && Object.keys(order.measurementsSnapshot).length > 0 && (
            <div className="py-4 border-b border-pink-100">
              <h5 className="font-bold text-xs text-pink-900 uppercase tracking-wider mb-2">
                {t.measurementsTitle}
              </h5>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                {Object.entries(order.measurementsSnapshot).map(([key, val]) => {
                  if (!val) return null;
                  const label = t.meas[key as keyof typeof t.meas] || key;
                  return (
                    <div key={key} className="bg-pink-50/50 p-2 rounded-lg border border-pink-100">
                      <span className="text-[11px] text-slate-500 block truncate">{label}</span>
                      <strong className="text-slate-900 font-mono text-sm">{String(val)}"</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="py-4 border-b border-pink-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>{t.totalStitchingPrice}:</span>
              <span className="font-mono tabular-nums">₹{order.totalPrice}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>{t.advancePaidAmount} ({order.paymentMode}):</span>
              <span className="font-mono tabular-nums">- ₹{order.advancePayment}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
              <span>{t.remainingBalance}:</span>
              <span className={`text-base font-mono tabular-nums ${order.remainingPayment > 0 ? 'text-pink-700' : 'text-emerald-700'}`}>
                ₹{order.remainingPayment}
              </span>
            </div>

            {order.remainingPayment > 0 && shopInfo.upiId && (
              <div className="mt-2 p-2.5 rounded-xl bg-pink-50 border border-pink-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-pink-700 font-bold uppercase block">
                    {lang === 'mr' ? 'बाकी पेमेंट UPI आयडी' : 'UPI Payment ID for Balance'}:
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{shopInfo.upiId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-600 block">{shopInfo.ownerName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">+91 {shopInfo.phone}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-4 text-center text-[11px] text-slate-400">
            <p>
              {lang === 'mr'
                ? 'कृपया डिलिव्हरी घेताना ही पावती सोबत आणावी. कपडे मिळाल्यापासून ३ दिवसात फिटिंग तपासावे.'
                : 'Please bring this receipt when picking up your garments. Check fitting within 3 days.'}
            </p>
            <p className="mt-1 font-semibold text-pink-600">
              {t.poweredBy}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
