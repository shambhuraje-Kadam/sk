import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, Language, ShopInfo, Customer } from '../types';
import { translations } from '../translations';
import {
  Smartphone,
  KeyRound,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Scissors,
  PackageCheck,
  Star,
  Sparkles,
  Ruler,
  AlertCircle,
  FileText,
  Calendar,
  Send,
  Bell,
  DollarSign,
  CreditCard,
  Copy,
  Printer
} from 'lucide-react';

interface CustomerPortalProps {
  lang: Language;
  shopInfo: ShopInfo;
  onOpenInvoice: (order: Order) => void;
  onRequestNotifications: () => void;
  notificationsEnabled: boolean;
  highlightOrderId?: string | null;
}

const statusOrder: OrderStatus[] = [
  'Order Received',
  'Stitching Started',
  'Stitching Completed',
  'Ready for Pickup',
  'Delivered'
];

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  lang,
  shopInfo,
  onOpenInvoice,
  onRequestNotifications,
  notificationsEnabled,
  highlightOrderId
}) => {
  const t = translations[lang];

  // Auth State (Name & Mobile Number Login / Auto-Registration, NO OTP)
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [welcomeNotice, setWelcomeNotice] = useState<string | null>(null);

  // Customer Data State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'measurements'>('orders');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'ready' | 'delivered' | 'pending_due'>('all');
  const [showUpiCard, setShowUpiCard] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedOrderUpiId, setCopiedOrderUpiId] = useState<string | null>(null);
  const [realtimePaymentNotice, setRealtimePaymentNotice] = useState<string | null>(null);

  // Feedback State
  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [fittingSatisfaction, setFittingSatisfaction] = useState<'perfect' | 'good' | 'needs_alteration'>('perfect');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Perfect Fitting', 'Neat Finishing']);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Check saved session
  useEffect(() => {
    const savedPhone = localStorage.getItem('sk_customer_phone');
    const savedName = localStorage.getItem('sk_customer_name');
    if (savedPhone) {
      setPhoneInput(savedPhone);
      if (savedName) setNameInput(savedName);
      fetchCustomerOrders(savedPhone);
      setIsLoggedIn(true);
    }
  }, []);

  const fetchCustomerOrders = async (phone: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customer/my-orders?phone=${phone}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        if (data.customer) {
          setCustomer(data.customer);
          if (data.customer.name && !nameInput) {
            setNameInput(data.customer.name);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // SSE Realtime listener for order updates
  useEffect(() => {
    if (!isLoggedIn || !phoneInput) return;

    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.event === 'order_status_updated' ||
          payload.event === 'order_created' ||
          payload.event === 'feedback_submitted' ||
          payload.event === 'order_payment_updated' ||
          payload.event === 'order_updated'
        ) {
          fetchCustomerOrders(phoneInput);
          if (payload.event === 'order_payment_updated' || payload.event === 'order_updated') {
            setRealtimePaymentNotice(
              lang === 'mr'
                ? '⚡ टेलरने बिल / पेमेंट माहिती रिअल-टाइम अपडेट केली!'
                : '⚡ Tailor updated your billing & payment in real-time!'
            );
            setTimeout(() => setRealtimePaymentNotice(null), 5000);
          }
        }
      } catch (e) {
        console.error('Error parsing SSE event:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isLoggedIn, phoneInput]);

  // Handle Direct Name & Phone Login / Auto-Registration (NO OTP)
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg(t.enterMobileNumber);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setWelcomeNotice(null);

    try {
      const res = await fetch('/api/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput, phone: cleanPhone })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('sk_customer_phone', cleanPhone);
        if (data.customer?.name) {
          localStorage.setItem('sk_customer_name', data.customer.name);
          setNameInput(data.customer.name);
        }
        setCustomer(data.customer);
        setIsLoggedIn(true);
        setWelcomeNotice(data.isNew ? t.newCustomerCreated : t.existingCustomerFound);
        fetchCustomerOrders(cleanPhone);
      } else {
        setErrorMsg(data.message || 'Login failed');
      }
    } catch {
      setErrorMsg('Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sk_customer_phone');
    localStorage.removeItem('sk_customer_name');
    setPhoneInput('');
    setNameInput('');
    setOrders([]);
    setCustomer(null);
    setIsLoggedIn(false);
    setWelcomeNotice(null);
  };

  // Submit Feedback
  const handleSubmitFeedback = async (orderId: string) => {
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          fittingSatisfaction,
          tags: selectedTags,
          comment: reviewComment,
          customerName: customer?.name || phoneInput,
          customerPhone: phoneInput
        })
      });
      const data = await res.json();
      if (data.success) {
        setReviewSuccessMsg(t.feedbackThanks);
        setFeedbackOrderId(null);
        fetchCustomerOrders(phoneInput);
      }
    } catch (e) {
      console.error('Error submitting feedback:', e);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // WhatsApp inquiry helper
  const handleWhatsAppChat = (order?: Order) => {
    const textMarathi = order
      ? `नमस्ते काकू! मी ${order.customerName}. माझी ऑर्डर क्र. ${order.id} (${order.garmentName}) बद्दल चौकशी करायची होती.`
      : `नमस्ते काकू! मी एस. के. लेडीज टेलर मधील शिलाई कामाबद्दल चौकशी करायची होती.`;

    const textEnglish = order
      ? `Hello SK Ladies Tailor! I am ${order.customerName}. Inquiring regarding my Order #${order.id} (${order.garmentName}).`
      : `Hello SK Ladies Tailor! I would like to inquire about stitching at your boutique.`;

    const message = encodeURIComponent(lang === 'mr' ? textMarathi : textEnglish);
    const shopPhone = shopInfo.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${shopPhone}?text=${message}`, '_blank');
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(shopInfo.upiId || '7385659762@upi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Calculate delivery countdown text
  const getDeliveryBadge = (order: Order) => {
    if (order.status === 'Delivered') {
      return { text: t.status['Delivered'], color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    }
    if (order.status === 'Ready for Pickup') {
      return {
        text: lang === 'mr' ? '🎉 दुकानात तयार आहे!' : '🎉 Ready for Pickup!',
        color: 'text-pink-700 bg-pink-50 border-pink-300 font-bold'
      };
    }

    const today = new Date().toISOString().split('T')[0];
    if (order.deliveryDate === today) {
      return {
        text: lang === 'mr' ? 'आज अपेक्षित डिलिव्हरी' : 'Due Today',
        color: 'text-amber-800 bg-amber-50 border-amber-200 font-bold'
      };
    }
    if (order.deliveryDate < today) {
      return {
        text: lang === 'mr' ? 'डिलिव्हरी तारीख उलटून गेली' : 'Past Promised Date',
        color: 'text-red-700 bg-red-50 border-red-200'
      };
    }

    const daysLeft = Math.ceil(
      (new Date(order.deliveryDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      text: lang === 'mr' ? `${daysLeft} दिवसांत तयार होईल` : `Ready in ${daysLeft} days`,
      color: 'text-slate-700 bg-slate-100 border-slate-200'
    };
  };

  // DIRECT CUSTOMER LOGIN / REGISTRATION (NO OTP, NO DEMO NUMBERS)
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        {/* Hero banner card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-pink-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

          {/* Icon and Branding */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-pink-600/20">
              <Scissors className="w-8 h-8" />
            </div>
            <h2 className="font-heading font-extrabold text-2xl text-slate-900">
              {t.customerLoginTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {t.customerLoginSubtitle}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCustomerLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {t.customerNameLabel}
              </label>
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t.customerNamePlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-sm font-medium transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {t.enterMobileNumber}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-xs">
                  +91
                </div>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 text-sm font-mono font-medium transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneInput.length < 10 || !nameInput.trim()}
              className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-pink-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Smartphone className="w-4 h-4" />
              <span>{isLoading ? t.loading : t.continueButton}</span>
            </button>

            <p className="text-[11px] text-center text-slate-400 mt-2">
              {lang === 'mr'
                ? 'आधी नोंदणी असल्यास थेट ऑर्डर्स दिसतील, नवीन असल्यास खाते सुरू होईल.'
                : 'Existing customers will view orders immediately. New customers will be registered automatically.'}
            </p>
          </form>

          {/* Quick shop inquiry button */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <button
              onClick={() => handleWhatsAppChat()}
              className="text-xs text-pink-700 hover:text-pink-800 font-semibold inline-flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{t.whatsappInquiry}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED CUSTOMER DASHBOARD
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {welcomeNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <strong className="font-semibold">{welcomeNotice}</strong>
          </div>
          <button
            onClick={() => setWelcomeNotice(null)}
            className="text-emerald-600 hover:text-emerald-800 text-[11px] font-medium"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {/* Customer Welcome Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-pink-600">
              {lang === 'mr' ? 'स्वागत आहे' : 'Welcome'}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-xs text-slate-500">+91 {phoneInput}</span>
          </div>
          <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900 mt-0.5">
            {customer?.name || (lang === 'mr' ? 'प्रिय ग्राहक' : 'Valued Customer')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'mr'
              ? `तुमच्या एकूण ${orders.length} शिलाई ऑर्डर्स नोंदवलेल्या आहेत.`
              : `You have ${orders.length} stitching orders in our tailoring register.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleWhatsAppChat()}
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>{t.whatsappInquiry}</span>
          </button>
          <a
            href={`tel:${shopInfo.phone}`}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-slate-600" />
            <span>{t.callShop}</span>
          </a>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            {t.logout}
          </button>
        </div>
      </div>

      {/* Push Notification Notice Banner (if not yet granted) */}
      {!notificationsEnabled && (
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl p-4 shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm">
                {t.pushNotificationTitle}
              </h4>
              <p className="text-xs text-white/90">
                {t.pushDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onRequestNotifications}
            className="px-4 py-2 rounded-xl bg-white text-pink-700 hover:bg-pink-50 font-bold text-xs whitespace-nowrap shadow-xs transition-colors"
          >
            {t.enablePushAlerts}
          </button>
        </div>
      )}

      {/* Real-time Payment & Billing Update Notification from Shop */}
      {realtimePaymentNotice && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{realtimePaymentNotice}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-100 bg-white/20 px-2 py-0.5 rounded-full">
            {lang === 'mr' ? 'लाईव्ह सिंक' : 'Live Sync'}
          </span>
        </div>
      )}

      {/* Tabs Switcher: Orders vs Measurements */}
      <div className="flex items-center gap-2 border-b border-pink-100 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{t.myOrders} ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('measurements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'measurements'
              ? 'bg-pink-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
          }`}
        >
          <Ruler className="w-4 h-4" />
          <span>{t.viewMeasurements}</span>
        </button>
      </div>

      {/* TAB 1: ORDERS LIST & STATUS TRACKING */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Customer Financial & Balance Due Strip */}
          {orders.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    {t.customerBillTotal}
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 mt-1 tabular-nums">
                    ₹{orders.reduce((acc, o) => acc + o.totalPrice, 0)}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {orders.length} {lang === 'mr' ? 'एकूण ऑर्डर्स' : 'Total Orders'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                    {t.customerAdvanceTotal}
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-700 mt-1 tabular-nums">
                    ₹{orders.reduce((acc, o) => acc + o.advancePayment, 0)}
                  </div>
                  <span className="text-[11px] text-emerald-600 mt-0.5 block">
                    {lang === 'mr' ? 'जमा ऍडव्हान्स' : 'Advance Paid'}
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border shadow-2xs ${
                  orders.reduce((acc, o) => acc + o.remainingPayment, 0) > 0
                    ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-pink-300'
                    : 'bg-emerald-50/60 border-emerald-200'
                }`}>
                  <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${
                    orders.reduce((acc, o) => acc + o.remainingPayment, 0) > 0 ? 'text-pink-800' : 'text-emerald-800'
                  }`}>
                    {t.customerRemainingTotal}
                  </span>
                  <div className={`text-2xl sm:text-3xl font-mono font-extrabold mt-1 tabular-nums ${
                    orders.reduce((acc, o) => acc + o.remainingPayment, 0) > 0 ? 'text-pink-700' : 'text-emerald-700'
                  }`}>
                    ₹{orders.reduce((acc, o) => acc + o.remainingPayment, 0)}
                  </div>
                  <span className={`text-[11px] font-semibold mt-0.5 block ${
                    orders.reduce((acc, o) => acc + o.remainingPayment, 0) > 0 ? 'text-pink-600' : 'text-emerald-600'
                  }`}>
                    {orders.reduce((acc, o) => acc + o.remainingPayment, 0) > 0
                      ? (lang === 'mr' ? 'कपडे घेताना दुकानात द्यायची बाकी' : 'Balance due upon pickup')
                      : t.allBillsCleared}
                  </span>
                </div>
              </div>

              {/* Customer Outstanding Payment & UPI Guidance Banner */}
              {orders.reduce((acc, o) => acc + o.remainingPayment, 0) > 0 && (
                <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-pink-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-pink-900">
                          {lang === 'mr' ? 'शिलाई बिल बाकी सूचना' : 'Stitching Bill Balance Notice'}
                        </h4>
                        <p className="text-xs text-pink-800 mt-0.5">
                          {t.pendingBalanceNotice} ({lang === 'mr' ? 'एकूण बाकी रक्कम' : 'Total Outstanding'}: <strong className="font-mono font-bold text-pink-900">₹{orders.reduce((acc, o) => acc + o.remainingPayment, 0)}</strong>)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowUpiCard(!showUpiCard)}
                      className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>{showUpiCard ? (lang === 'mr' ? 'माहिती लपवा' : 'Hide Payment Info') : t.payViaUpi}</span>
                    </button>
                  </div>

                  {showUpiCard && (
                    <div className="bg-white rounded-xl p-4 border border-pink-200 text-xs space-y-3 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-pink-100">
                        <div>
                          <span className="text-slate-400 text-[11px] block">{lang === 'mr' ? 'दुकानदार / टेलर मालकीण' : 'Shop Owner'}:</span>
                          <strong className="text-slate-800 text-sm">{shopInfo.ownerName} ({shopInfo.name})</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[11px] block">{lang === 'mr' ? 'मोबाईल नंबर' : 'Phone'}:</span>
                          <strong className="font-mono text-slate-800 text-sm">+91 {shopInfo.phone}</strong>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-pink-50/50 p-3 rounded-xl border border-pink-200">
                        <div>
                          <span className="text-[11px] text-pink-700 font-semibold block">PhonePe / Google Pay / Paytm UPI ID:</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-sm text-slate-900">{shopInfo.upiId || '7385659762@upi'}</span>
                            <button
                              onClick={handleCopyUpi}
                              className="px-2 py-0.5 rounded text-[11px] font-bold bg-white text-pink-700 border border-pink-200 hover:bg-pink-100 cursor-pointer"
                            >
                              {copiedUpi ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        <a
                          href={`upi://pay?pa=${encodeURIComponent(shopInfo.upiId || '7385659762@upi')}&pn=${encodeURIComponent(shopInfo.name)}&am=${orders.reduce((acc, o) => acc + o.remainingPayment, 0)}&cu=INR`}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs text-center shadow-xs transition-colors"
                        >
                          {lang === 'mr'
                            ? `UPI ॲपने ₹${orders.reduce((acc, o) => acc + o.remainingPayment, 0)} भरा`
                            : `Pay ₹${orders.reduce((acc, o) => acc + o.remainingPayment, 0)} via UPI`}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Order Status Filters */}
          {orders.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-pink-50 border border-pink-100'
                }`}
              >
                {t.filterAllOrders} ({orders.length})
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'in_progress'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-pink-50 border border-pink-100'
                }`}
              >
                {t.filterInProgress} ({orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Ready for Pickup').length})
              </button>
              <button
                onClick={() => setStatusFilter('ready')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'ready'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-pink-50 border border-pink-100'
                }`}
              >
                🎉 {t.filterReady} ({orders.filter((o) => o.status === 'Ready for Pickup').length})
              </button>
              <button
                onClick={() => setStatusFilter('delivered')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'delivered'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-pink-50 border border-pink-100'
                }`}
              >
                {t.filterDelivered} ({orders.filter((o) => o.status === 'Delivered').length})
              </button>
              <button
                onClick={() => setStatusFilter('pending_due')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'pending_due'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                <span>⚠ {t.filterPendingPayment}</span>
                <span className="font-mono">({orders.filter((o) => o.remainingPayment > 0).length})</span>
              </button>
            </div>
          )}

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-pink-100">
              <PackageCheck className="w-12 h-12 text-pink-300 mx-auto mb-3" />
              <h3 className="font-heading font-bold text-slate-800 text-base">
                {t.noOrdersFound}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {lang === 'mr'
                  ? 'तुमची नवीन ऑर्डर दुकानात नोंदवताच येथे रिअल-टाइम दिसेल.'
                  : 'As soon as your stitching order is booked by the tailor, it will appear here in real time.'}
              </p>
              <button
                onClick={() => handleWhatsAppChat()}
                className="mt-4 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold inline-flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t.whatsappInquiry}</span>
              </button>
            </div>
          ) : (
            orders
              .filter((o) => {
                if (statusFilter === 'in_progress') {
                  return o.status === 'Order Received' || o.status === 'Stitching Started' || o.status === 'Stitching Completed';
                }
                if (statusFilter === 'ready') return o.status === 'Ready for Pickup';
                if (statusFilter === 'delivered') return o.status === 'Delivered';
                if (statusFilter === 'pending_due') return o.remainingPayment > 0;
                return true;
              })
              .map((order) => {
                const currentIdx = statusOrder.indexOf(order.status);
                const badge = getDeliveryBadge(order);
                const isDelivered = order.status === 'Delivered';
                const isHighlight = highlightOrderId === order.id;

              return (
                <div
                  key={order.id}
                  id={`order-${order.id}`}
                  className={`bg-white rounded-3xl p-6 sm:p-7 shadow-xs border transition-all ${
                    isHighlight
                      ? 'border-2 border-pink-500 ring-4 ring-pink-100 shadow-md'
                      : 'border-pink-100 hover:border-pink-300'
                  }`}
                >
                  {/* Order Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-pink-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-pink-700 bg-pink-50 px-2.5 py-0.5 rounded-md border border-pink-200">
                          {order.id}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {order.orderDate}
                        </span>
                        {order.urgent && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase">
                            Urgent
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading font-extrabold text-lg text-slate-900">
                        {order.garmentName}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:text-right">
                      {order.remainingPayment > 0 ? (
                        <div className="px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold font-mono">
                          {t.remainingBalance}: ₹{order.remainingPayment}
                        </div>
                      ) : (
                        <div className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                          ✓ {t.paid}
                        </div>
                      )}
                      <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${badge.color}`}>
                        {badge.text}
                      </div>
                      <button
                        onClick={() => onOpenInvoice(order)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1"
                        title={t.printReceipt}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{lang === 'mr' ? 'पावती' : 'Receipt'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5-STAGE INTERACTIVE TRACKING TIMELINE */}
                  <div className="py-6 border-b border-pink-50">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                      {t.trackYourOrder}
                    </div>

                    {/* Progress Track */}
                    <div className="relative">
                      {/* Connecting Line */}
                      <div className="absolute top-4 left-4 right-4 h-1 bg-slate-100 rounded-full -z-0">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-rose-600 transition-all duration-700 rounded-full"
                          style={{
                            width: `${(currentIdx / (statusOrder.length - 1)) * 100}%`
                          }}
                        />
                      </div>

                      {/* 5 Stage Points */}
                      <div className="grid grid-cols-5 relative z-10 text-center">
                        {statusOrder.map((st, idx) => {
                          const isCompleted = idx <= currentIdx;
                          const isCurrent = idx === currentIdx;

                          return (
                            <div key={st} className="flex flex-col items-center">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                                  isCompleted
                                    ? isCurrent
                                      ? 'bg-pink-600 text-white ring-4 ring-pink-200 scale-110'
                                      : 'bg-pink-500 text-white'
                                    : 'bg-white text-slate-400 border-2 border-slate-200'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                  <span className="font-mono text-[11px]">{idx + 1}</span>
                                )}
                              </div>
                              <span
                                className={`text-[11px] font-semibold mt-2 max-w-[70px] sm:max-w-none leading-tight ${
                                  isCurrent
                                    ? 'text-pink-700 font-extrabold'
                                    : isCompleted
                                    ? 'text-slate-800'
                                    : 'text-slate-400'
                                }`}
                              >
                                {t.status[st] || st}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current Stage Explanation Note */}
                    <div className="mt-5 p-3 rounded-2xl bg-pink-50/60 border border-pink-100 flex items-start gap-2.5 text-xs text-slate-700">
                      <Clock className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>{t.status[order.status] || order.status}: </strong>
                        <span>
                          {t.statusDesc[order.status] || 'Your order is progressing smoothly.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Garment Specifications */}
                  <div className="py-3 border-b border-pink-50 text-xs text-slate-600">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <div>
                        <span className="text-slate-400">{t.garment}: </span>
                        <strong className="text-slate-900">{order.garmentName} ({order.quantity} {lang === 'mr' ? 'नग' : 'Pcs'})</strong>
                      </div>
                      {order.neckDesign && (
                        <div>
                          <span className="text-slate-400">{t.neckDesign}: </span>
                          <span className="text-slate-800 font-medium">{order.neckDesign}</span>
                        </div>
                      )}
                      {order.sleeveDesign && (
                        <div>
                          <span className="text-slate-400">{t.sleeveDesign}: </span>
                          <span className="text-slate-800 font-medium">{order.sleeveDesign}</span>
                        </div>
                      )}
                      {order.liningIncluded && (
                        <div className="text-pink-700 font-semibold inline-flex items-center gap-1">
                          <span>✓ {lang === 'mr' ? 'अस्तर जोडलेले (Lining Included)' : 'Lining Included'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dedicated Interactive 'Billing Details' Section */}
                  <div className="my-4 rounded-2xl border border-pink-200/90 bg-gradient-to-br from-white via-pink-50/20 to-rose-50/30 p-4 sm:p-5 shadow-2xs space-y-3.5">
                    {/* Billing Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold shrink-0">
                          <CreditCard className="w-4 h-4 text-pink-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                              {t.billingDetailsCardTitle || 'Billing Details'}
                            </h4>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {t.liveRealtimeSync || 'Live'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {lang === 'mr' ? 'शिलाई बिल व पेमेंट तपशील' : 'Stitching fees & payment status'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Status Badge */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border ${
                            order.remainingPayment === 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.advancePayment > 0
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {order.remainingPayment === 0
                            ? `✓ ${t.paid}`
                            : order.advancePayment > 0
                            ? t.partial
                            : t.unpaid}
                        </span>
                      </div>
                    </div>

                    {/* 3 Metric Cards: Total Bill, Advance Paid, Remaining Balance Due */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                      {/* Total Price */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs">
                        <span className="text-[11px] font-medium text-slate-500 block">
                          {t.totalBill}
                        </span>
                        <div className="font-mono text-lg sm:text-xl font-black text-slate-900 tabular-nums mt-0.5">
                          ₹{order.totalPrice}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {order.quantity} {lang === 'mr' ? 'नग शिलाई' : 'Pcs'}
                        </span>
                      </div>

                      {/* Advance Paid */}
                      <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 shadow-2xs">
                        <span className="text-[11px] font-bold text-emerald-800 block">
                          {t.advancePaid}
                        </span>
                        <div className="font-mono text-lg sm:text-xl font-black text-emerald-700 tabular-nums mt-0.5">
                          ₹{order.advancePayment}
                        </div>
                        <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                          {order.paymentMode || 'Cash'}
                        </span>
                      </div>

                      {/* Exact Remaining Balance Due */}
                      <div
                        className={`p-3 rounded-xl border shadow-2xs ${
                          order.remainingPayment > 0
                            ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200/50'
                            : 'bg-emerald-50/70 border-emerald-200'
                        }`}
                      >
                        <span
                          className={`text-[11px] font-extrabold uppercase tracking-wide block ${
                            order.remainingPayment > 0 ? 'text-rose-900' : 'text-emerald-900'
                          }`}
                        >
                          {t.remainingBalance}
                        </span>
                        <div
                          className={`font-mono text-xl sm:text-2xl font-black tabular-nums mt-0.5 ${
                            order.remainingPayment > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{order.remainingPayment}
                        </div>
                        <span className="text-[10px] font-semibold block mt-0.5">
                          {order.remainingPayment > 0
                            ? (lang === 'mr' ? 'कपडे घेताना द्यायची बाकी' : 'Balance Due at Pickup')
                            : (lang === 'mr' ? 'पूर्ण जमा (काहीही बाकी नाही)' : 'All cleared')}
                        </span>
                      </div>
                    </div>

                    {/* Payment Progress Bar */}
                    <div className="bg-white/80 p-2.5 rounded-xl border border-pink-100/70 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-medium">
                          {lang === 'mr' ? 'जमा पेमेंट प्रमाण' : 'Payment Status'}
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {Math.min(100, Math.round((order.advancePayment / (order.totalPrice || 1)) * 100))}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            order.remainingPayment === 0
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-pink-500 to-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round((order.advancePayment / (order.totalPrice || 1)) * 100))}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Interactive Customer Payment & Invoice Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-pink-100/70">
                      {order.remainingPayment > 0 ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Direct UPI payment link */}
                          <a
                            href={`upi://pay?pa=${encodeURIComponent(shopInfo.upiId || '7385659762@axl')}&pn=${encodeURIComponent(shopInfo.ownerName || 'SAYALI KADAM')}&am=${order.remainingPayment}&cu=INR`}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span>
                              {lang === 'mr'
                                ? `बाकी ₹${order.remainingPayment} UPI ने भरा`
                                : `Pay Remaining ₹${order.remainingPayment} via UPI`}
                            </span>
                          </a>

                          {/* Copy Shop UPI ID button */}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(shopInfo.upiId || '7385659762@axl');
                              setCopiedOrderUpiId(order.id);
                              setTimeout(() => setCopiedOrderUpiId(null), 2500);
                            }}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Copy Shop UPI ID"
                          >
                            <Copy className="w-3.5 h-3.5 text-pink-600" />
                            <span>
                              {copiedOrderUpiId === order.id
                                ? (lang === 'mr' ? '✓ कॉपी केले!' : '✓ Copied!')
                                : `${shopInfo.upiId || '7385659762@axl'}`}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{t.balanceClearedBadge || 'Paid in Full'}</span>
                        </div>
                      )}

                      {/* Print Receipt button */}
                      <button
                        type="button"
                        onClick={() => onOpenInvoice(order)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t.printReceipt}</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions & Feedback Row */}
                  <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => handleWhatsAppChat(order)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-200"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      <span>{t.whatsappInquiry}</span>
                    </button>

                    {/* FEEDBACK & RATING FEATURE: When Order is Delivered */}
                    {isDelivered && (
                      <div>
                        {order.review ? (
                          <div className="p-3 bg-pink-50/80 rounded-2xl border border-pink-200 text-xs flex items-center gap-3">
                            <div className="flex items-center text-amber-500 font-bold">
                              {[...Array(order.review.rating)].map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              ))}
                              <span className="ml-1 text-slate-900 font-mono">{order.review.rating}.0</span>
                            </div>
                            <span className="text-pink-900 font-medium">
                              "{order.review.comment || (lang === 'mr' ? 'अभिप्राय नोंदवला' : 'Review recorded')}"
                            </span>
                          </div>
                        ) : feedbackOrderId === order.id ? (
                          // Feedback Form Modal / Drawer
                          <div className="w-full mt-3 p-4 bg-pink-50/90 rounded-2xl border-2 border-pink-300 space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="font-heading font-bold text-sm text-pink-900 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-pink-600" />
                                <span>{t.feedbackTitle}</span>
                              </h4>
                              <button
                                onClick={() => setFeedbackOrderId(null)}
                                className="text-slate-400 hover:text-slate-600 text-xs"
                              >
                                {t.cancel}
                              </button>
                            </div>

                            {/* 5-Star interactive selector */}
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                {t.rateExperience}
                              </label>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="p-1 hover:scale-110 transition-transform"
                                  >
                                    <Star
                                      className={`w-6 h-6 ${
                                        star <= rating
                                          ? 'fill-amber-400 text-amber-400'
                                          : 'text-slate-300'
                                      }`}
                                    />
                                  </button>
                                ))}
                                <span className="ml-2 font-mono text-sm font-bold text-slate-800">
                                  {rating} / 5
                                </span>
                              </div>
                            </div>

                            {/* Fitting Satisfaction */}
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                {t.fittingSatisfaction}
                              </label>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFittingSatisfaction('perfect')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    fittingSatisfaction === 'perfect'
                                      ? 'bg-pink-600 text-white shadow-xs'
                                      : 'bg-white border border-pink-200 text-slate-700'
                                  }`}
                                >
                                  {t.fittingPerfect}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFittingSatisfaction('good')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    fittingSatisfaction === 'good'
                                      ? 'bg-pink-600 text-white shadow-xs'
                                      : 'bg-white border border-pink-200 text-slate-700'
                                  }`}
                                >
                                  {t.fittingGood}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFittingSatisfaction('needs_alteration')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    fittingSatisfaction === 'needs_alteration'
                                      ? 'bg-pink-600 text-white shadow-xs'
                                      : 'bg-white border border-pink-200 text-slate-700'
                                  }`}
                                >
                                  {t.fittingAlteration}
                                </button>
                              </div>
                            </div>

                            {/* Quick Feedback Tags */}
                            <div>
                              <div className="flex flex-wrap gap-1.5">
                                {t.feedbackTags.map((tag) => {
                                  const isSelected = selectedTags.includes(tag);
                                  return (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => toggleTag(tag)}
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                        isSelected
                                          ? 'bg-pink-200 text-pink-900 border border-pink-400 font-semibold'
                                          : 'bg-white border border-slate-200 text-slate-600 hover:border-pink-200'
                                      }`}
                                    >
                                      {tag}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Comment */}
                            <div>
                              <textarea
                                rows={2}
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder={t.reviewPlaceholder}
                                className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300 focus:border-pink-500"
                              />
                            </div>

                            <button
                              type="button"
                              disabled={isSubmittingReview}
                              onClick={() => handleSubmitFeedback(order.id)}
                              className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>{isSubmittingReview ? t.loading : t.submitFeedback}</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setFeedbackOrderId(order.id);
                              setRating(5);
                              setReviewComment('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
                          >
                            <Star className="w-4 h-4 fill-white text-white" />
                            <span>{t.giveFeedbackButton}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: SAVED CUSTOMER MEASUREMENTS */}
      {activeTab === 'measurements' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-pink-100 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-pink-100">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
              <Ruler className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-slate-900">
                {t.measurementsTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'mr'
                  ? 'पुढील सर्व ऑर्डर्ससाठी हे माप टेलर दुकानात सुरक्षित जतन केलेले आहे.'
                  : 'These measurements are saved at the tailor atelier for your future orders.'}
              </p>
            </div>
          </div>

          {/* Blouse Measurements */}
          <div>
            <h4 className="font-bold text-sm text-pink-900 mb-3 flex items-center gap-2">
              <span>{t.blouseMeasurementsTab}</span>
              <span className="text-[11px] font-normal text-slate-400">
                ({lang === 'mr' ? 'इंच मध्ये' : 'Inches'})
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {customer?.measurements?.blouse ? (
                Object.entries(customer.measurements.blouse).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-pink-50/50 border border-pink-100">
                    <span className="text-[11px] text-slate-500 block truncate">
                      {t.meas[k as keyof typeof t.meas] || k}
                    </span>
                    <strong className="text-sm font-mono text-slate-900">
                      {v ? `${v}"` : '-'}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 col-span-full">No blouse measurements recorded yet.</p>
              )}
            </div>
          </div>

          {/* Dress Measurements */}
          <div className="pt-4 border-t border-pink-100">
            <h4 className="font-bold text-sm text-pink-900 mb-3 flex items-center gap-2">
              <span>{t.dressMeasurementsTab}</span>
              <span className="text-[11px] font-normal text-slate-400">
                ({lang === 'mr' ? 'इंच मध्ये' : 'Inches'})
              </span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {customer?.measurements?.dress ? (
                Object.entries(customer.measurements.dress).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl bg-pink-50/50 border border-pink-100">
                    <span className="text-[11px] text-slate-500 block truncate">
                      {t.meas[k as keyof typeof t.meas] || k}
                    </span>
                    <strong className="text-sm font-mono text-slate-900">
                      {v ? `${v}"` : '-'}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 col-span-full">No dress measurements recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
