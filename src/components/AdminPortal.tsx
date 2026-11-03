import React, { useState, useEffect } from 'react';
import {
  Order,
  OrderStatus,
  Customer,
  Language,
  ShopInfo,
  BusinessReports,
  CustomerReview,
  BlouseMeasurements,
  DressMeasurements
} from '../types';
import { translations } from '../translations';
import {
  Shield,
  KeyRound,
  LayoutDashboard,
  Scissors,
  PlusCircle,
  Users,
  BarChart3,
  Star,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  MessageCircle,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  Ruler,
  Check,
  Edit2,
  CreditCard
} from 'lucide-react';

interface AdminPortalProps {
  lang: Language;
  shopInfo: ShopInfo;
  onOpenInvoice: (order: Order) => void;
  onOrderUpdated: () => void;
}

const statusOrder: OrderStatus[] = [
  'Order Received',
  'Stitching Started',
  'Stitching Completed',
  'Ready for Pickup',
  'Delivered'
];

export const AdminPortal: React.FC<AdminPortalProps> = ({
  lang,
  shopInfo,
  onOpenInvoice,
  onOrderUpdated
}) => {
  const t = translations[lang];

  // Auth State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'orders' | 'new_order' | 'customers' | 'reports' | 'feedback'
  >('dashboard');

  // Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reports, setReports] = useState<BusinessReports | null>(null);
  const [feedbackData, setFeedbackData] = useState<{
    totalReviews: number;
    avgRating: number;
    ratingCounts: Record<number, number>;
    satisfactionCounts: Record<string, number>;
    tagCounts: Record<string, number>;
    reviews: CustomerReview[];
  } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New Order Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [garmentType, setGarmentType] = useState('blouse');
  const [customGarmentName, setCustomGarmentName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [neckDesign, setNeckDesign] = useState('');
  const [sleeveDesign, setSleeveDesign] = useState('');
  const [liningIncluded, setLiningIncluded] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [totalPrice, setTotalPrice] = useState<number>(650);
  const [advancePayment, setAdvancePayment] = useState<number>(300);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'PhonePe / GPay (UPI)'>('Cash');

  // Measurements inside new order
  const [measurementsTab, setMeasurementsTab] = useState<'blouse' | 'dress'>('blouse');
  const [measBlouse, setMeasBlouse] = useState<BlouseMeasurements>({
    length: '14.5',
    chest: '36',
    waist: '30',
    shoulder: '14',
    sleeveLength: '6.5',
    sleeveRound: '12',
    frontNeck: '6.5',
    backNeck: '9.0',
    dartPoint: '9.5',
    armhole: '15.5'
  });
  const [measDress, setMeasDress] = useState<DressMeasurements>({
    length: '40',
    chest: '37',
    waist: '32',
    hip: '40',
    shoulder: '15',
    sleeveLength: '16',
    sleeveRound: '11',
    salwarLength: '38',
    salwarBottom: '13'
  });

  // Customer Management Modal State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Payment Recording Modal
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [collectAmount, setCollectAmount] = useState<number>(0);
  const [collectMode, setCollectMode] = useState<'Cash' | 'PhonePe / GPay (UPI)'>('Cash');

  // Delivery Date Edit Modal
  const [dateModalOrder, setDateModalOrder] = useState<Order | null>(null);
  const [newDeliveryDate, setNewDeliveryDate] = useState<string>('');

  // Interactive Billing Details Modification Modal
  const [billingEditOrder, setBillingEditOrder] = useState<Order | null>(null);
  const [editTotalPrice, setEditTotalPrice] = useState<number>(0);
  const [editAdvancePayment, setEditAdvancePayment] = useState<number>(0);
  const [editPaymentMode, setEditPaymentMode] = useState<'Cash' | 'PhonePe / GPay (UPI)'>('Cash');
  const [billingToast, setBillingToast] = useState<string | null>(null);
  const [isSavingBilling, setIsSavingBilling] = useState(false);

  // Check saved Admin Token
  useEffect(() => {
    const token = localStorage.getItem('sk_admin_token');
    if (token) {
      setIsAdminLoggedIn(true);
      fetchAllAdminData();
    }
  }, []);

  const fetchAllAdminData = async () => {
    try {
      const [resOrders, resCustomers, resReports, resFeedback] = await Promise.all([
        fetch('/api/orders').then((r) => r.json()),
        fetch('/api/customers').then((r) => r.json()),
        fetch('/api/reports').then((r) => r.json()),
        fetch('/api/feedback').then((r) => r.json())
      ]);

      if (resOrders.success) setOrders(resOrders.orders || []);
      if (resCustomers.success) setCustomers(resCustomers.customers || []);
      if (resReports.success) setReports(resReports.summary || null);
      if (resFeedback.success) setFeedbackData(resFeedback);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  // Real-time SSE Sync for Admin
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.event === 'order_status_updated' ||
          payload.event === 'order_created' ||
          payload.event === 'customer_added' ||
          payload.event === 'customer_updated' ||
          payload.event === 'order_payment_updated' ||
          payload.event === 'feedback_submitted'
        ) {
          fetchAllAdminData();
        }
      } catch (e) {
        console.error('Error in SSE Admin listener:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [isAdminLoggedIn]);

  // Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('sk_admin_token', data.token);
        setIsAdminLoggedIn(true);
        fetchAllAdminData();
      } else {
        setLoginError(data.message || t.invalidPin);
      }
    } catch {
      setLoginError('Server error');
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('sk_admin_token');
    setIsAdminLoggedIn(false);
    setPinInput('');
  };

  // Update Status
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        fetchAllAdminData();
        onOrderUpdated();
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalOrder || collectAmount <= 0) return;

    try {
      const res = await fetch(`/api/orders/${paymentModalOrder.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: collectAmount,
          paymentMode: collectMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setPaymentModalOrder(null);
        setCollectAmount(0);
        fetchAllAdminData();
        onOrderUpdated();
      }
    } catch (e) {
      console.error('Error recording payment:', e);
    }
  };

  // Open Billing Details Editor Modal
  const handleOpenBillingModal = (order: Order) => {
    setBillingEditOrder(order);
    setEditTotalPrice(order.totalPrice);
    setEditAdvancePayment(order.advancePayment);
    setEditPaymentMode(order.paymentMode || 'Cash');
  };

  // Save Modified Billing Details (Total, Advance, Mode) with instant real-time sync
  const handleSaveBillingDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingEditOrder) return;

    setIsSavingBilling(true);
    try {
      const res = await fetch(`/api/orders/${billingEditOrder.id}/billing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalPrice: editTotalPrice,
          advancePayment: editAdvancePayment,
          paymentMode: editPaymentMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setBillingEditOrder(null);
        setBillingToast(t.paymentUpdatedSuccess || 'Billing details updated successfully!');
        setTimeout(() => setBillingToast(null), 3500);
        fetchAllAdminData();
        onOrderUpdated();
      }
    } catch (err) {
      console.error('Error updating billing details:', err);
    } finally {
      setIsSavingBilling(false);
    }
  };

  // Quick 1-Click Partial / Balance Payment
  const handleQuickAddPayment = async (orderId: string, amount: number) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: amount,
          paymentMode: 'Cash'
        })
      });
      const data = await res.json();
      if (data.success) {
        setBillingToast(`₹${amount} ${lang === 'mr' ? 'पेमेंट जमा झाले' : 'payment recorded!'}`);
        setTimeout(() => setBillingToast(null), 3000);
        fetchAllAdminData();
        onOrderUpdated();
      }
    } catch (e) {
      console.error('Error in quick pay:', e);
    }
  };

  // Update Delivery Date
  const handleUpdateDeliveryDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateModalOrder || !newDeliveryDate) return;

    try {
      const res = await fetch(`/api/orders/${dateModalOrder.id}/delivery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryDate: newDeliveryDate })
      });
      const data = await res.json();
      if (data.success) {
        setDateModalOrder(null);
        fetchAllAdminData();
        onOrderUpdated();
      }
    } catch (e) {
      console.error('Error updating delivery date:', e);
    }
  };

  // Customer Selection Auto-fill
  const handleSelectExistingCustomer = (cId: string) => {
    setSelectedCustomerId(cId);
    const cust = customers.find((c) => c.id === cId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      if (cust.measurements?.blouse) {
        setMeasBlouse(cust.measurements.blouse);
      }
      if (cust.measurements?.dress) {
        setMeasDress(cust.measurements.dress);
      }
    }
  };

  // Create Order Submit
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deliveryDate) {
      alert('Please fill customer name, phone, and delivery date');
      return;
    }

    const garmentTitle =
      customGarmentName.trim() ||
      t.garmentOptions[garmentType as keyof typeof t.garmentOptions] ||
      garmentType;

    const payload = {
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      garmentType,
      garmentName: garmentTitle,
      quantity,
      neckDesign,
      sleeveDesign,
      liningIncluded,
      specialInstructions,
      urgent,
      orderDate,
      deliveryDate,
      totalPrice,
      advancePayment,
      paymentMode,
      measurementsSnapshot: garmentType.includes('dress') || garmentType.includes('anarkali') ? measDress : measBlouse
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(t.orderCreatedSuccess);
        // Reset form & go to orders tab
        setSelectedCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomGarmentName('');
        setNeckDesign('');
        setSleeveDesign('');
        setSpecialInstructions('');
        setUrgent(false);
        setActiveTab('orders');
        fetchAllAdminData();
        onOrderUpdated();
      }
    } catch (e) {
      console.error('Error creating order:', e);
    }
  };

  // Save Customer Changes
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      if (editingCustomer.id) {
        // Update
        const res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingCustomer)
        });
        const data = await res.json();
        if (data.success) {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
          fetchAllAdminData();
        }
      } else {
        // Create new
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingCustomer)
        });
        const data = await res.json();
        if (data.success) {
          setIsCustomerModalOpen(false);
          setEditingCustomer(null);
          fetchAllAdminData();
        }
      }
    } catch (e) {
      console.error('Error saving customer:', e);
    }
  };

  // WhatsApp notification sender
  const handleSendWhatsAppUpdate = (order: Order) => {
    const textMarathi = `🌸 *${shopInfo.marathiName}* 🌸
नमस्कार ${order.customerName}!
तुमच्या ऑर्डर क्र. ${order.id} (${order.garmentName}) ची स्थिती आता:
👉 *${t.status[order.status] || order.status}* आहे.
अपेक्षित डिलिव्हरी: ${order.deliveryDate}
शिल्लक रक्कम: ₹${order.remainingPayment}
पत्ता: ${shopInfo.address}
धन्यवाद!`;

    const textEnglish = `🌸 *${shopInfo.name}* 🌸
Hello ${order.customerName}!
Status for Order #${order.id} (${order.garmentName}) has been updated to:
👉 *${order.status}*
Expected Delivery: ${order.deliveryDate}
Balance Due: ₹${order.remainingPayment}
Shop Address: ${shopInfo.address}
Thank you!`;

    const message = encodeURIComponent(lang === 'mr' ? textMarathi : textEnglish);
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank');
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'pending_due'
        ? o.remainingPayment > 0
        : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSendPaymentReminder = (cust: { name: string; phone: string }, dueAmount: number) => {
    const textMarathi = `🌸 *${shopInfo.marathiName}* 🌸
नमस्कार ${cust.name}!
एस. के. लेडीज टेलरकडून नम्र विनंती की आपल्या शिलाई ऑर्डरची शिल्लक रक्कम ₹${dueAmount} आहे.
कृपया कपडे नेण्याच्या वेळी किंवा ऑनलाईन UPI द्वारे जमा करावी:
UPI ID: ${shopInfo.upiId || '7385659762@upi'}
मोबाईल: ${shopInfo.phone}
पत्ता: ${shopInfo.address}
धन्यवाद!`;

    const textEnglish = `🌸 *${shopInfo.name}* 🌸
Hello ${cust.name}!
Gentle reminder from SK Ladies Tailor regarding your pending stitching balance of ₹${dueAmount}.
Please settle this at pickup or via online UPI:
UPI ID: ${shopInfo.upiId || '7385659762@upi'}
Phone: ${shopInfo.phone}
Address: ${shopInfo.address}
Thank you!`;

    const message = encodeURIComponent(lang === 'mr' ? textMarathi : textEnglish);
    const cleanPhone = cust.phone.replace(/\D/g, '');
    window.open(`https://wa.me/91${cleanPhone}?text=${message}`, '_blank');
  };

  // Filtered Customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  // LOGIN SCREEN
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-pink-100 text-center relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-400 text-white flex items-center justify-center mx-auto mb-4 shadow-md shadow-pink-600/20">
            <Shield className="w-8 h-8" />
          </div>

          <h2 className="font-heading font-extrabold text-2xl text-slate-900">
            {t.adminLoginTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {t.adminLoginSubtitle}
          </p>

          {loginError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {t.enterPin}
              </label>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-widest text-2xl font-mono py-3 rounded-xl border border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                autoFocus
              />
            </div>

            <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-between text-xs text-pink-900">
              <span className="font-medium">{t.demoPinNotice}</span>
              <button
                type="button"
                onClick={() => setPinInput('3866')}
                className="px-2.5 py-1 rounded-md bg-pink-600 text-white font-semibold text-[11px] hover:bg-pink-700 transition-colors"
              >
                {lang === 'mr' ? 'पिन भरा' : 'Use PIN'}
              </button>
            </div>

            <button
              type="submit"
              disabled={!pinInput}
              className="w-full py-3.5 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-pink-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <KeyRound className="w-4 h-4" />
              <span>{t.loginAsAdmin}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ADMIN WORKSPACE
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Admin Subheader & Navigation Tabs */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-pink-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t.tabDashboard}</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>{t.tabOrders} ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new_order')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'new_order'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.tabNewOrder}</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t.tabCustomers} ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t.tabReports}</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-pink-50'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{t.adminFeedbackTab} ({feedbackData?.totalReviews || 0})</span>
          </button>
        </div>

        <button
          onClick={handleAdminLogout}
          className="text-xs text-slate-500 hover:text-slate-800 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors self-end md:self-auto shrink-0"
        >
          {t.logout}
        </button>
      </div>

      {/* Real-time Billing & Payment Toast Feedback */}
      {billingToast && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{billingToast}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-100 bg-white/20 px-2 py-0.5 rounded-full">
            {lang === 'mr' ? 'रिअल-टाइम सिंक' : 'Real-time Live Sync'}
          </span>
        </div>
      )}

      {/* 1. DASHBOARD VIEW */}
      {activeTab === 'dashboard' && reports && (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-pink-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t.kpiTodayOrders}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1 tabular-nums">
                {reports.todayOrdersCount}
              </div>
              <span className="text-[11px] text-pink-600 mt-1 block">
                {lang === 'mr' ? 'नवीन नोंदणी' : 'Booked Today'}
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-pink-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t.kpiTodayDeliveries}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 font-mono mt-1 tabular-nums">
                {reports.todayDeliveries.length}
              </div>
              <span className="text-[11px] text-amber-600 mt-1 block">
                {lang === 'mr' ? 'आज द्यायचे कपडे' : 'Deliveries Due'}
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-pink-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t.kpiTodayRevenue}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono mt-1 tabular-nums">
                ₹{reports.todayRevenue}
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                {lang === 'mr' ? 'ऍडव्हान्स जमा' : 'Collected'}
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-pink-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t.kpiMonthRevenue}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-pink-700 font-mono mt-1 tabular-nums">
                ₹{reports.monthRevenue}
              </div>
              <span className="text-[11px] text-pink-600 mt-1 block">
                {lang === 'mr' ? 'या महिन्याची कमाई' : 'This Month'}
              </span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-pink-100 shadow-2xs col-span-2 lg:col-span-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {t.kpiPendingBalance}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-red-600 font-mono mt-1 tabular-nums">
                ₹{reports.pendingBalanceTotal}
              </div>
              <span className="text-[11px] text-red-500 mt-1 block">
                {lang === 'mr' ? 'डिलिव्हरी वेळी येणे बाकी' : 'To Collect'}
              </span>
            </div>
          </div>

          {/* Today's Deliveries & Urgent Orders Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Orders Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-pink-100">
              <div className="flex items-center justify-between pb-4 border-b border-pink-50 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    {t.urgentDeliveries} ({reports.urgentOrders.length})
                  </h3>
                </div>
                <span className="text-xs text-red-600 font-bold uppercase tracking-wider">
                  Priority
                </span>
              </div>

              {reports.urgentOrders.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {lang === 'mr' ? 'सध्या कोणतीही तातडीची ऑर्डर प्रलंबित नाही.' : 'No pending urgent orders.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {reports.urgentOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl bg-red-50/50 border border-red-200/60 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-xs text-red-800">{ord.id}</strong>
                          <span className="text-xs font-bold text-slate-900">{ord.customerName}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{ord.garmentName}</p>
                        <span className="text-[11px] text-red-600 font-semibold block mt-0.5">
                          {t.deliveryDateLabel}: {ord.deliveryDate}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-pink-700 block">
                          {t.status[ord.status] || ord.status}
                        </span>
                        <button
                          onClick={() => {
                            setActiveTab('orders');
                            setSearchQuery(ord.id);
                          }}
                          className="mt-1.5 px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition-colors"
                        >
                          {t.viewDetails}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Deliveries Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-pink-100">
              <div className="flex items-center justify-between pb-4 border-b border-pink-50 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-600" />
                  <h3 className="font-heading font-extrabold text-base text-slate-900">
                    {t.todayDeliveryList} ({reports.todayDeliveries.length})
                  </h3>
                </div>
                <span className="text-xs text-pink-700 font-semibold">
                  {new Date().toISOString().split('T')[0]}
                </span>
              </div>

              {reports.todayDeliveries.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  {lang === 'mr' ? 'आज कोणतीही डिलिव्हरी नियोजित नाही.' : 'No deliveries scheduled for today.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {reports.todayDeliveries.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-200/60 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-xs text-pink-800">{ord.id}</strong>
                          <span className="text-xs font-bold text-slate-900">{ord.customerName}</span>
                          <span className="text-[11px] text-slate-500 font-mono">{ord.customerPhone}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{ord.garmentName}</p>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {t.remainingBalance}: <strong className="text-pink-700 font-mono">₹{ord.remainingPayment}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleSendWhatsAppUpdate(ord)}
                          className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="WhatsApp Notice"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(ord.id, 'Ready for Pickup')}
                          className="px-2.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition-colors"
                        >
                          {t.status['Ready for Pickup']}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ORDERS MANAGEMENT VIEW */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xs border border-pink-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'mr' ? 'ग्राहक नाव, फोन नंबर किंवा ऑर्डर क्र. शोधा...' : 'Search customer name, phone or order ID...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-200 text-xs focus:ring-2 focus:ring-pink-300 focus:border-pink-500"
              />
            </div>

            {/* Status Segmented Filter */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-pink-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.all} ({orders.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending_due')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                  statusFilter === 'pending_due'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <span>⚠ {t.filterPendingPayment}</span>
                <span className="font-mono font-bold">({orders.filter((o) => o.remainingPayment > 0).length})</span>
              </button>
              {statusOrder.map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.status[st] || st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-pink-100">
                <p className="text-xs text-slate-400">{t.noOrdersFound}</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-pink-100 hover:border-pink-300 transition-all space-y-4"
                >
                  {/* Row 1: Header & Status Control */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-pink-50">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-extrabold text-pink-700 bg-pink-50 px-2.5 py-1 rounded-md border border-pink-200">
                        {order.id}
                      </span>
                      <div>
                        <h4 className="font-heading font-extrabold text-base text-slate-900">
                          {order.customerName}
                        </h4>
                        <span className="font-mono text-xs text-slate-500">
                          +91 {order.customerPhone}
                        </span>
                      </div>
                      {order.urgent && (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold uppercase">
                          Urgent
                        </span>
                      )}
                    </div>

                    {/* Quick Status Dropdown Updater */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 hidden sm:inline">{t.updateStatus}:</span>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                        className="py-1.5 px-3 rounded-xl border-2 border-pink-200 text-xs font-bold text-pink-800 bg-pink-50/50 focus:ring-2 focus:ring-pink-300 focus:border-pink-500 cursor-pointer"
                      >
                        {statusOrder.map((st) => (
                          <option key={st} value={st}>
                            {t.status[st] || st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Garment info, Delivery Date, Pricing */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">{t.garment}</span>
                      <strong className="text-slate-900 text-sm">{order.garmentName}</strong>
                      <span className="text-slate-500 block mt-0.5">
                        {order.quantity} {lang === 'mr' ? 'नग' : 'Pcs'}
                        {order.liningIncluded && ` • ${lang === 'mr' ? 'अस्तर' : 'Lining'}`}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block">{t.deliveryDateLabel}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <strong className="text-slate-900 font-bold text-sm">
                          {order.deliveryDate}
                        </strong>
                        <button
                          onClick={() => {
                            setDateModalOrder(order);
                            setNewDeliveryDate(order.deliveryDate);
                          }}
                          className="p-1 text-slate-400 hover:text-pink-600 rounded"
                          title={t.changeDeliveryDate}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {t.orderDateLabel}: {order.orderDate}
                      </span>
                    </div>

                  </div>

                  {/* Dedicated Interactive 'Billing Details' Section on Order Card */}
                  <div className="rounded-2xl border border-pink-200/90 bg-gradient-to-br from-white via-pink-50/30 to-rose-50/40 p-3.5 sm:p-4 shadow-2xs space-y-3">
                    {/* Billing Section Header with Status & Real-time Indicator */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pink-100/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
                              {t.billingDetailsCardTitle || 'Billing Details'}
                            </h4>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {t.liveRealtimeSync || 'Live'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {lang === 'mr' ? 'एकूण दर, जमा ऍडव्हान्स आणि बाकी येणे' : 'Total price, advance paid & remaining balance'}
                          </span>
                        </div>
                      </div>

                      {/* Payment Status Badge */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-extrabold px-2.5 py-0.5 rounded-lg border ${
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

                    {/* 3 Clear Metric Columns: Total, Advance, Remaining */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          {t.totalBill}
                        </span>
                        <div className="font-mono font-black text-base sm:text-lg text-slate-900 tabular-nums mt-0.5">
                          ₹{order.totalPrice}
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {order.quantity} {lang === 'mr' ? 'नग शिलाई' : 'Pcs'}
                        </span>
                      </div>

                      <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100/90 shadow-2xs">
                        <span className="text-[11px] font-bold text-emerald-800 block">
                          {t.advancePaid}
                        </span>
                        <div className="font-mono font-black text-base sm:text-lg text-emerald-700 tabular-nums mt-0.5">
                          ₹{order.advancePayment}
                        </div>
                        <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">
                          {order.paymentMode || 'Cash'}
                        </span>
                      </div>

                      <div
                        className={`p-2.5 rounded-xl border shadow-2xs ${
                          order.remainingPayment > 0
                            ? 'bg-rose-50 border-rose-200 ring-2 ring-rose-200/50'
                            : 'bg-emerald-50/60 border-emerald-100'
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
                          className={`font-mono font-black text-base sm:text-xl tabular-nums mt-0.5 ${
                            order.remainingPayment > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{order.remainingPayment}
                        </div>
                        <span className="text-[10px] font-semibold block mt-0.5">
                          {order.remainingPayment > 0
                            ? (lang === 'mr' ? 'येणे बाकी रक्कम' : 'Balance Due')
                            : (lang === 'mr' ? 'सर्व रक्कम जमा ✓' : 'Fully Cleared ✓')}
                        </span>
                      </div>
                    </div>

                    {/* Payment Progress Bar */}
                    <div className="bg-white/80 p-2 rounded-xl border border-pink-100/60 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span>{lang === 'mr' ? 'पेमेंट जमा प्रमाण' : 'Payment Cleared'}</span>
                        <span className="font-mono font-bold text-slate-700">
                          {Math.min(100, Math.round((order.advancePayment / (order.totalPrice || 1)) * 100))}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
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

                    {/* Interactive Action Controls within Billing Details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-pink-100/70">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Interactive Edit Billing Modal trigger */}
                        <button
                          type="button"
                          onClick={() => handleOpenBillingModal(order)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-pink-50 text-pink-700 border border-pink-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          title={t.editBilling}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-pink-600" />
                          <span>{t.adjustPricingBtn || 'Edit Billing'}</span>
                        </button>

                        {/* Quick Payment Collection if balance > 0 */}
                        {order.remainingPayment > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentModalOrder(order);
                                setCollectAmount(order.remainingPayment);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>{t.collectBalance}</span>
                            </button>

                            {order.remainingPayment > 100 && (
                              <button
                                type="button"
                                onClick={() => handleQuickAddPayment(order.id, 100)}
                                className="px-2 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer transition-colors"
                                title="Add ₹100 payment"
                              >
                                +₹100
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Right action buttons: Print Receipt & WhatsApp */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenInvoice(order)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t.printReceipt}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppUpdate(order)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t.shareWhatsApp}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. NEW ORDER VIEW */}
      {activeTab === 'new_order' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-pink-100 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 pb-6 border-b border-pink-100 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
              <PlusCircle className="w-6 h-6 text-pink-600" />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-xl text-slate-900">
                {t.createNewOrderTitle}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'mr' ? 'नवीन शिलाई ऑर्डरची माहिती आणि मापे भरा' : 'Fill stitching details and customer measurements'}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-6">
            {/* Customer Select or New */}
            <div className="bg-pink-50/50 p-4 sm:p-5 rounded-2xl border border-pink-100 space-y-4">
              <h4 className="font-bold text-xs text-pink-900 uppercase tracking-wider">
                {t.customerSelection}
              </h4>

              {/* Select Existing Customer */}
              {customers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.selectExistingCustomer}
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
                  >
                    <option value="">-- {lang === 'mr' ? 'नवीन ग्राहक किंवा निवडा' : 'Select Customer / Add New'} --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.customerName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="उदा. सुनीता पाटील"
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.customerPhone} *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9823011223"
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Garment Details */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-pink-900 uppercase tracking-wider">
                {lang === 'mr' ? 'कपड्याचा प्रकार आणि डिझाईन' : 'Garment & Design Specifications'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.garmentType}
                  </label>
                  <select
                    value={garmentType}
                    onChange={(e) => setGarmentType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300 font-medium"
                  >
                    {Object.entries(t.garmentOptions).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.customGarmentName}
                  </label>
                  <input
                    type="text"
                    value={customGarmentName}
                    onChange={(e) => setCustomGarmentName(e.target.value)}
                    placeholder="उदा. पैठणी ब्लाऊज, डिझायनर कुर्ती"
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.quantity}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.neckDesign}
                  </label>
                  <input
                    type="text"
                    value={neckDesign}
                    onChange={(e) => setNeckDesign(e.target.value)}
                    placeholder={t.neckDesignPlaceholder}
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.sleeveDesign}
                  </label>
                  <input
                    type="text"
                    value={sleeveDesign}
                    onChange={(e) => setSleeveDesign(e.target.value)}
                    placeholder={t.sleeveDesignPlaceholder}
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={liningIncluded}
                    onChange={(e) => setLiningIncluded(e.target.checked)}
                    className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 border-pink-300"
                  />
                  <span>{t.liningIncluded}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-red-700">
                  <input
                    type="checkbox"
                    checked={urgent}
                    onChange={(e) => setUrgent(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-red-300"
                  />
                  <span>⚠ {t.urgentOrder}</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.specialInstructions}
                </label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="उदा. मागे नॉट व लटकन, कंबरपट्टी दुहेरी टीप, कप्स जोडणे"
                  className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
                />
              </div>
            </div>

            {/* Measurements Section */}
            <div className="bg-pink-50/40 p-4 sm:p-5 rounded-2xl border border-pink-100 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-pink-200">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-pink-600" />
                  <h4 className="font-bold text-xs text-pink-900 uppercase tracking-wider">
                    {t.measurementsTitle}
                  </h4>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-pink-200">
                  <button
                    type="button"
                    onClick={() => setMeasurementsTab('blouse')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      measurementsTab === 'blouse'
                        ? 'bg-pink-600 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    {t.blouseMeasurementsTab}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMeasurementsTab('dress')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      measurementsTab === 'dress'
                        ? 'bg-pink-600 text-white'
                        : 'text-slate-600'
                    }`}
                  >
                    {t.dressMeasurementsTab}
                  </button>
                </div>
              </div>

              {measurementsTab === 'blouse' ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(measBlouse).map(([k, val]) => (
                    <div key={k}>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5 truncate">
                        {t.meas[k as keyof typeof t.meas] || k}
                      </label>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setMeasBlouse({ ...measBlouse, [k]: e.target.value })
                        }
                        className="w-full p-2 rounded-lg border border-pink-200 text-xs bg-white font-mono"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(measDress).map(([k, val]) => (
                    <div key={k}>
                      <label className="block text-[11px] font-medium text-slate-600 mb-0.5 truncate">
                        {t.meas[k as keyof typeof t.meas] || k}
                      </label>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setMeasDress({ ...measDress, [k]: e.target.value })
                        }
                        className="w-full p-2 rounded-lg border border-pink-200 text-xs bg-white font-mono"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dates & Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  {lang === 'mr' ? 'तारीख नियोजन' : 'Schedule'}
                </h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.orderDateLabel}
                  </label>
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 font-bold text-pink-700">
                    {t.deliveryDateLabel} *
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-pink-300 text-xs bg-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  {t.pricingAndPayment}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.totalStitchingPrice}
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {t.advancePaidAmount}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={advancePayment}
                      onChange={(e) => setAdvancePayment(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white font-mono text-emerald-700 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="font-bold text-slate-700">{t.remainingCalculated}:</span>
                  <span className="font-mono text-base font-extrabold text-pink-700">
                    ₹{Math.max(0, totalPrice - advancePayment)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.paymentModeLabel}
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs bg-white font-medium"
                  >
                    <option value="Cash">{t.cash}</option>
                    <option value="PhonePe / GPay (UPI)">{t.upi}</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-pink-600 hover:bg-pink-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-pink-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{t.saveOrderButton}</span>
            </button>
          </form>
        </div>
      )}

      {/* 4. CUSTOMERS & MEASUREMENTS VIEW */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Top Aggregate KPI Strip for Customer Accounts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {lang === 'mr' ? 'एकूण नोंदणीकृत ग्राहक' : 'Total Customers'}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900 mt-1">
                {customers.length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {lang === 'mr' ? 'एकूण शिलाई ऑर्डर्स' : 'Total Orders'}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-extrabold text-pink-700 mt-1">
                {orders.length}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                {t.totalCustomerPaid}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-extrabold text-emerald-700 mt-1">
                ₹{orders.reduce((sum, o) => sum + (o.advancePayment || 0), 0)}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border shadow-2xs ${
              orders.reduce((sum, o) => sum + (o.remainingPayment || 0), 0) > 0
                ? 'bg-rose-50/80 border-rose-200'
                : 'bg-emerald-50/60 border-emerald-200'
            }`}>
              <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${
                orders.reduce((sum, o) => sum + (o.remainingPayment || 0), 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                {t.totalPendingDuesAllCustomers}
              </span>
              <div className={`text-xl sm:text-2xl font-mono font-extrabold mt-1 ${
                orders.reduce((sum, o) => sum + (o.remainingPayment || 0), 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                ₹{orders.reduce((sum, o) => sum + (o.remainingPayment || 0), 0)}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'mr' ? 'ग्राहक नाव किंवा फोन नंबर शोधा...' : 'Search customer by name or phone...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <button
              onClick={() => {
                setEditingCustomer({
                  id: '',
                  name: '',
                  phone: '',
                  address: '',
                  notes: '',
                  measurements: {
                    blouse: { length: '', chest: '', waist: '', shoulder: '', sleeveLength: '', sleeveRound: '', frontNeck: '', backNeck: '', dartPoint: '', armhole: '' },
                    dress: { length: '', chest: '', waist: '', hip: '', shoulder: '', sleeveLength: '', sleeveRound: '', salwarLength: '', salwarBottom: '' }
                  },
                  createdAt: new Date().toISOString()
                });
                setIsCustomerModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs flex items-center gap-2 transition-colors self-start sm:self-auto shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{lang === 'mr' ? 'नवीन ग्राहक जोडा' : 'Add New Customer'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.map((cust) => {
              const custOrders = orders.filter((o) => o.customerId === cust.id || o.customerPhone === cust.phone);
              const custOrdersCount = custOrders.length;
              const custBilled = custOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
              const custPaid = custOrders.reduce((sum, o) => sum + (o.advancePayment || 0), 0);
              const custRemaining = Math.max(0, custBilled - custPaid);
              const unpaidOrder = custOrders.find((o) => o.remainingPayment > 0);

              return (
                <div
                  key={cust.id}
                  className="bg-white rounded-3xl p-5 shadow-xs border border-pink-100 hover:border-pink-300 transition-all space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-heading font-extrabold text-base text-slate-900">
                        {cust.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-slate-500">
                          +91 {cust.phone}
                        </span>
                        <a
                          href={`tel:${cust.phone}`}
                          className="p-1 rounded text-slate-400 hover:text-pink-600"
                          title="Call Customer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCustomer(cust);
                          setIsCustomerModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
                        title={t.edit}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {cust.address && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {cust.address}
                    </p>
                  )}

                  {/* Customer Billing & Remaining Payment Box */}
                  <div className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                    custRemaining > 0
                      ? 'bg-gradient-to-br from-rose-50 to-pink-50/60 border-rose-200'
                      : 'bg-emerald-50/50 border-emerald-200'
                  }`}>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>{t.totalCustomerBill}:</span>
                      <strong className="font-mono text-slate-900">₹{custBilled}</strong>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700">
                      <span>{t.totalCustomerPaid}:</span>
                      <strong className="font-mono">₹{custPaid}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/80">
                      <span className={`font-bold ${custRemaining > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {t.totalCustomerRemaining}:
                      </span>
                      <span className={`font-mono font-black text-sm tabular-nums ${
                        custRemaining > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        ₹{custRemaining}
                      </span>
                    </div>

                    {custRemaining > 0 && unpaidOrder && (
                      <div className="pt-2 flex flex-wrap items-center gap-1.5">
                        <button
                          onClick={() => {
                            setPaymentModalOrder(unpaidOrder);
                            setCollectAmount(unpaidOrder.remainingPayment);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>{t.collectBalance}</span>
                        </button>
                        <button
                          onClick={() => handleSendPaymentReminder(cust, custRemaining)}
                          className="px-2.5 py-1 rounded-lg bg-pink-100 hover:bg-pink-200 text-pink-800 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="WhatsApp Reminder"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>{lang === 'mr' ? 'आठवण मेसेज' : 'Reminder'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-pink-50 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {lang === 'mr' ? 'ऑर्डर्स:' : 'Orders:'}{' '}
                      <strong className="text-slate-800 font-mono">{custOrdersCount}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          handleSelectExistingCustomer(cust.id);
                          setActiveTab('new_order');
                        }}
                        className="text-pink-600 hover:text-pink-700 font-semibold text-[11px] hover:underline"
                      >
                        + {lang === 'mr' ? 'नवीन ऑर्डर' : 'New Order'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingCustomer(cust);
                          setIsCustomerModalOpen(true);
                        }}
                        className="text-pink-600 hover:underline font-semibold flex items-center gap-1 text-[11px]"
                      >
                        <Ruler className="w-3 h-3" />
                        <span>{t.viewMeasurements}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. BUSINESS REPORTS VIEW */}
      {activeTab === 'reports' && reports && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-pink-100">
            <h3 className="font-heading font-extrabold text-xl text-slate-900 mb-6">
              {t.reportsTitle}
            </h3>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs text-emerald-800 font-medium block">
                  {t.kpiMonthRevenue}
                </span>
                <div className="text-2xl font-mono font-extrabold text-emerald-700 mt-1">
                  ₹{reports.monthRevenue}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                <span className="text-xs text-red-800 font-medium block">
                  {t.totalReceivable}
                </span>
                <div className="text-2xl font-mono font-extrabold text-red-700 mt-1">
                  ₹{reports.pendingBalanceTotal}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100">
                <span className="text-xs text-pink-800 font-medium block">
                  {lang === 'mr' ? 'एकूण नोंदवलेल्या ऑर्डर्स' : 'Total Lifetime Orders'}
                </span>
                <div className="text-2xl font-mono font-extrabold text-pink-700 mt-1">
                  {reports.totalOrdersCount}
                </div>
              </div>
            </div>

            {/* Order Pipeline Distribution */}
            <h4 className="font-bold text-xs text-pink-900 uppercase tracking-wider mb-4">
              {t.statusDistribution}
            </h4>

            <div className="space-y-3">
              {statusOrder.map((st) => {
                const count = reports.statusCounts[st] || 0;
                const pct = reports.totalOrdersCount > 0 ? (count / reports.totalOrdersCount) * 100 : 0;

                return (
                  <div key={st} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{t.status[st] || st}</span>
                      <strong className="font-mono text-slate-900">
                        {count} ({pct.toFixed(0)}%)
                      </strong>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-600 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. CUSTOMER FEEDBACK & RATINGS VIEW */}
      {activeTab === 'feedback' && feedbackData && (
        <div className="space-y-6">
          {/* Feedback Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Average Rating Score Card */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-pink-100 text-center flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                {t.averageRatingLabel}
              </span>
              <div className="text-5xl font-mono font-extrabold text-amber-500 mt-2 flex items-center justify-center gap-2">
                <span>{feedbackData.avgRating}</span>
                <Star className="w-8 h-8 fill-amber-400 text-amber-400" />
              </div>
              <span className="text-xs text-slate-500 mt-2 block">
                {feedbackData.totalReviews} {lang === 'mr' ? 'ग्राहकांनी रेटिंग दिले' : 'Customer Reviews Logged'}
              </span>
            </div>

            {/* Fitting Satisfaction Breakdown */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-pink-100 space-y-3">
              <h4 className="font-bold text-xs text-pink-900 uppercase tracking-wider">
                {t.fittingSatisfactionBreakdown}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">{t.fittingPerfect}</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {feedbackData.satisfactionCounts.perfect || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">{t.fittingGood}</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {feedbackData.satisfactionCounts.good || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">{t.fittingAlteration}</span>
                  <span className="font-bold text-red-600 font-mono">
                    {feedbackData.satisfactionCounts.needs_alteration || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Popular Appreciation Tags */}
            <div className="bg-white rounded-3xl p-6 shadow-xs border border-pink-100 space-y-3">
              <h4 className="font-bold text-xs text-pink-900 uppercase tracking-wider">
                {lang === 'mr' ? 'ग्राहकांची आवडती वैशिष्ट्ये' : 'Top Highlights'}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(feedbackData.tagCounts).map(([tag, cnt]) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-900 text-[11px] font-medium"
                  >
                    {tag} ({cnt})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Customer Reviews List */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-pink-100 space-y-4">
            <h4 className="font-heading font-extrabold text-lg text-slate-900 pb-3 border-b border-pink-50">
              {t.customerVoice}
            </h4>

            {feedbackData.reviews.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                {t.noFeedbackYet}
              </p>
            ) : (
              feedbackData.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-pink-50/40 border border-pink-100 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm text-slate-900">{rev.customerName}</strong>
                        <span className="font-mono text-xs text-slate-400">+91 {rev.customerPhone}</span>
                      </div>
                      <span className="text-xs text-slate-500">{rev.garmentName}</span>
                    </div>

                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-xl border border-pink-100/60">
                    "{rev.comment}"
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {rev.tags.map((tg) => (
                      <span
                        key={tg}
                        className="px-2 py-0.5 rounded-md bg-white border border-pink-200 text-[10px] text-pink-700 font-medium"
                      >
                        ✓ {tg}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT & MODIFY BILLING DETAILS (TOTAL, ADVANCE, BALANCE, MODE) */}
      {billingEditOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-pink-100 space-y-4 animate-in fade-in">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-pink-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h4 className="font-heading font-extrabold text-base text-slate-900">
                    {t.updateBillingTitle || 'Edit Billing & Payments'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {billingEditOrder.id} • {billingEditOrder.customerName} ({billingEditOrder.garmentName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBillingEditOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {t.updateBillingDesc || 'Adjust total stitching price or advance paid. Remaining balance updates automatically in real-time.'}
            </p>

            <form onSubmit={handleSaveBillingDetails} className="space-y-4">
              {/* Total Price Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.totalStitchingPrice} (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editTotalPrice}
                    onChange={(e) => setEditTotalPrice(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-pink-200 text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-pink-300"
                  />
                </div>
              </div>

              {/* Advance Paid Input + Quick Helper Buttons */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    {t.advancePaidAmount} (₹) *
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditAdvancePayment(editTotalPrice)}
                      className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                    >
                      {lang === 'mr' ? 'पूर्ण (100%)' : 'Full (100%)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAdvancePayment(Math.round(editTotalPrice / 2))}
                      className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 text-[10px] font-bold border border-pink-200 hover:bg-pink-100 cursor-pointer"
                    >
                      {lang === 'mr' ? 'अर्धे (50%)' : 'Half (50%)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditAdvancePayment(0)}
                      className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-200 hover:bg-slate-100 cursor-pointer"
                    >
                      {lang === 'mr' ? 'शून्य (₹0)' : 'Zero (₹0)'}
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-emerald-700">₹</span>
                  <input
                    type="number"
                    required
                    min={0}
                    max={editTotalPrice}
                    value={editAdvancePayment}
                    onChange={(e) => setEditAdvancePayment(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-emerald-200 text-base font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.paymentModeLabel}
                </label>
                <select
                  value={editPaymentMode}
                  onChange={(e) => setEditPaymentMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-pink-200 text-xs bg-white focus:ring-2 focus:ring-pink-300"
                >
                  <option value="Cash">{t.cash} (Cash)</option>
                  <option value="PhonePe / GPay (UPI)">{t.upi} (PhonePe / GPay / UPI)</option>
                </select>
              </div>

              {/* Live Preview Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">{t.totalBill}:</span>
                  <span className="font-mono font-bold text-slate-900">₹{editTotalPrice}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-emerald-700">
                  <span className="font-medium">{t.advancePaid}:</span>
                  <span className="font-mono font-bold">₹{editAdvancePayment}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-pink-200 text-sm font-extrabold">
                  <span className={Math.max(0, editTotalPrice - editAdvancePayment) > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    {t.remainingBalance}:
                  </span>
                  <span
                    className={`font-mono text-base tabular-nums ${
                      Math.max(0, editTotalPrice - editAdvancePayment) > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    ₹{Math.max(0, editTotalPrice - editAdvancePayment)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500">{t.paymentStatus}:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded ${
                      Math.max(0, editTotalPrice - editAdvancePayment) === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : editAdvancePayment > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {Math.max(0, editTotalPrice - editAdvancePayment) === 0
                      ? t.paid
                      : editAdvancePayment > 0
                      ? t.partial
                      : t.unpaid}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingBilling}
                  className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isSavingBilling ? t.loading : (lang === 'mr' ? 'बिल जतन करा (Real-time Sync)' : 'Save & Sync Real-time')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingEditOrder(null)}
                  className="px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-semibold"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT PAYMENT */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 space-y-4">
            <h4 className="font-heading font-bold text-base text-slate-900">
              {t.collectBalance} - {paymentModalOrder.id}
            </h4>
            <p className="text-xs text-slate-500">
              {paymentModalOrder.customerName} • {paymentModalOrder.garmentName}
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {lang === 'mr' ? 'जमा करावयाची रक्कम (₹)' : 'Amount to Collect (₹)'}
                </label>
                <input
                  type="number"
                  min={1}
                  max={paymentModalOrder.remainingPayment}
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-pink-200 text-base font-mono font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.paymentModeLabel}
                </label>
                <select
                  value={collectMode}
                  onChange={(e) => setCollectMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-pink-200 text-xs"
                >
                  <option value="Cash">{t.cash}</option>
                  <option value="PhonePe / GPay (UPI)">{t.upi}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                >
                  {lang === 'mr' ? 'पेमेंट नोंदवा' : 'Save Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModalOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DELIVERY DATE */}
      {dateModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-pink-100 space-y-4">
            <h4 className="font-heading font-bold text-base text-slate-900">
              {t.changeDeliveryDate}
            </h4>
            <p className="text-xs text-slate-500">
              {dateModalOrder.id} • {dateModalOrder.customerName}
            </p>

            <form onSubmit={handleUpdateDeliveryDate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.deliveryDateLabel}
                </label>
                <input
                  type="date"
                  required
                  value={newDeliveryDate}
                  onChange={(e) => setNewDeliveryDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-pink-200 text-xs font-mono font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs"
                >
                  {t.save}
                </button>
                <button
                  type="button"
                  onClick={() => setDateModalOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER MEASUREMENTS EDIT */}
      {isCustomerModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-pink-100 max-h-[90vh] overflow-y-auto space-y-5">
            <h4 className="font-heading font-extrabold text-lg text-slate-900">
              {editingCustomer.id ? `${t.edit}: ${editingCustomer.name}` : (lang === 'mr' ? 'नवीन ग्राहक व मापे' : 'New Customer & Measurements')}
            </h4>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.customerName} *</label>
                  <input
                    type="text"
                    required
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">{t.customerPhone} *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full p-2.5 rounded-xl border border-pink-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">{t.customerAddress}</label>
                <input
                  type="text"
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                  placeholder="उदा. कोथरूड, पुणे"
                  className="w-full p-2.5 rounded-xl border border-pink-200 text-xs"
                />
              </div>

              {/* Blouse Measurements */}
              <div className="pt-2">
                <h5 className="font-bold text-xs text-pink-900 uppercase tracking-wider mb-2">
                  {t.blouseMeasurementsTab} ({lang === 'mr' ? 'इंच' : 'Inches'})
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(editingCustomer.measurements?.blouse || {}).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[10px] text-slate-500 block truncate">{t.meas[k as keyof typeof t.meas] || k}</span>
                      <input
                        type="text"
                        value={v}
                        onChange={(e) =>
                          setEditingCustomer({
                            ...editingCustomer,
                            measurements: {
                              ...editingCustomer.measurements,
                              blouse: {
                                ...editingCustomer.measurements.blouse,
                                [k]: e.target.value
                              }
                            }
                          })
                        }
                        className="w-full p-1.5 rounded-lg border border-pink-200 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dress Measurements */}
              <div className="pt-2">
                <h5 className="font-bold text-xs text-pink-900 uppercase tracking-wider mb-2">
                  {t.dressMeasurementsTab} ({lang === 'mr' ? 'इंच' : 'Inches'})
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {Object.entries(editingCustomer.measurements?.dress || {}).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-[10px] text-slate-500 block truncate">{t.meas[k as keyof typeof t.meas] || k}</span>
                      <input
                        type="text"
                        value={v}
                        onChange={(e) =>
                          setEditingCustomer({
                            ...editingCustomer,
                            measurements: {
                              ...editingCustomer.measurements,
                              dress: {
                                ...editingCustomer.measurements.dress,
                                [k]: e.target.value
                              }
                            }
                          })
                        }
                        className="w-full p-1.5 rounded-lg border border-pink-200 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs shadow-xs"
                >
                  {t.saveCustomerMeasurements}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomerModalOpen(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
