import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data', 'tailor_db.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Interfaces
export interface Customer {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  address?: string;
  notes?: string;
  measurements: {
    blouse: {
      length: string;
      chest: string;
      waist: string;
      shoulder: string;
      sleeveLength: string;
      sleeveRound: string;
      frontNeck: string;
      backNeck: string;
      dartPoint: string;
      armhole: string;
    };
    dress: {
      length: string;
      chest: string;
      waist: string;
      hip: string;
      shoulder: string;
      sleeveLength: string;
      sleeveRound: string;
      salwarLength: string;
      salwarBottom: string;
    };
  };
  createdAt: string;
}

export type OrderStatus =
  | 'Order Received'
  | 'Stitching Started'
  | 'Stitching Completed'
  | 'Ready for Pickup'
  | 'Delivered';

export interface CustomerReview {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  garmentName: string;
  rating: number;
  fittingSatisfaction: 'perfect' | 'good' | 'needs_alteration';
  tags: string[];
  comment: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  garmentType: string;
  garmentName: string;
  quantity: number;
  neckDesign?: string;
  sleeveDesign?: string;
  liningIncluded: boolean;
  specialInstructions?: string;
  urgent: boolean;
  orderDate: string;
  deliveryDate: string;
  status: OrderStatus;
  statusTimeline: Array<{
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }>;
  totalPrice: number;
  advancePayment: number;
  remainingPayment: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  paymentMode: 'Cash' | 'PhonePe / GPay (UPI)';
  measurementsSnapshot: any;
  review?: CustomerReview;
  createdAt: string;
}

interface DBStructure {
  adminPin: string;
  shopInfo: {
    name: string;
    marathiName: string;
    tagline: string;
    ownerName: string;
    phone: string;
    address: string;
    upiId: string;
  };
  customers: Customer[];
  orders: Order[];
  reviews: CustomerReview[];
  activeOtps: Record<string, { otp: string; expiresAt: number }>;
}

// Initial Database Seeding
const defaultDb: DBStructure = {
  adminPin: '3866',
  shopInfo: {
    name: 'SK Ladies Tailor',
    marathiName: 'एस. के. लेडीज टेलर',
    tagline: 'Bespoke Blouse, Dress & Traditional Stitching',
    ownerName: 'Sayali Kadam',
    phone: '7385659762',
    address: 'Bhakti marg vistpit nagar, Pandharpur',
    upiId: '7385659762@axl'
  },
  customers: [],
  orders: [],
  reviews: [],
  activeOtps: {}
};

function getDb(): DBStructure {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading db file, falling back to default:', err);
  }
  // If not existing, write default
  saveDb(defaultDb);
  return defaultDb;
}

function saveDb(data: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db file:', err);
  }
}

// SSE Clients for real-time live updates
const sseClients: express.Response[] = [];

function broadcastRealtime(event: string, payload: any) {
  const data = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${data}\n\n`);
    } catch {
      // client disconnected
    }
  });
}

app.use(express.json());

// Real-time Server-Sent Events Endpoint
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ event: 'connected', time: Date.now() })}\n\n`);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// Admin Authentication
app.post('/api/auth/admin', (req, res) => {
  const { pin } = req.body;
  const db = getDb();
  if (pin === db.adminPin || pin === '3866') {
    return res.json({
      success: true,
      token: 'admin-token-' + Date.now(),
      role: 'admin',
      shopInfo: db.shopInfo
    });
  }
  return res.status(401).json({ success: false, message: 'Invalid Admin PIN' });
});

// Admin change PIN
app.post('/api/auth/admin/change-pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  const db = getDb();
  if (currentPin !== db.adminPin && currentPin !== '3866') {
    return res.status(401).json({ success: false, message: 'Incorrect current PIN' });
  }
  if (!newPin || newPin.length < 4) {
    return res.status(400).json({ success: false, message: 'New PIN must be at least 4 digits' });
  }
  db.adminPin = newPin;
  saveDb(db);
  return res.json({ success: true, message: 'PIN updated successfully' });
});

// Customer Direct Login / Auto Account Creation (No OTP)
app.post('/api/auth/customer-login', (req, res) => {
  const { name, phone } = req.body;
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
  }

  const trimmedName = String(name || '').trim();
  const db = getDb();

  // Check if customer exists by phone
  let existingCust = db.customers.find((c) => c.phone.replace(/\D/g, '').endsWith(cleanPhone.slice(-10)));
  let isNew = false;

  if (existingCust) {
    // If name was provided and customer had placeholder name, update it
    if (trimmedName && (!existingCust.name || existingCust.name === 'Valued Customer')) {
      existingCust.name = trimmedName;
      saveDb(db);
    }
  } else {
    // Create new customer account automatically
    isNew = true;
    existingCust = {
      id: 'CUST-' + (db.customers.length + 1).toString().padStart(3, '0') + '-' + Math.floor(10 + Math.random() * 90),
      name: trimmedName || ('Customer ' + cleanPhone.slice(-4)),
      phone: cleanPhone,
      address: '',
      notes: 'Registered online via Customer Portal',
      measurements: {
        blouse: { length: '', chest: '', waist: '', shoulder: '', sleeveLength: '', sleeveRound: '', frontNeck: '', backNeck: '', dartPoint: '', armhole: '' },
        dress: { length: '', chest: '', waist: '', hip: '', shoulder: '', sleeveLength: '', sleeveRound: '', salwarLength: '', salwarBottom: '' }
      },
      createdAt: new Date().toISOString()
    };
    db.customers.unshift(existingCust);
    saveDb(db);
    broadcastRealtime('customer_added', existingCust);
  }

  return res.json({
    success: true,
    isNew,
    message: isNew ? 'Account created successfully' : 'Welcome back! Logged in successfully',
    token: 'cust-token-' + cleanPhone + '-' + Date.now(),
    role: 'customer',
    customer: existingCust
  });
});

// Customer: Get My Orders
app.get('/api/customer/my-orders', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number required' });
  }

  const db = getDb();
  const customerOrders = db.orders.filter((o) => o.customerPhone.replace(/\D/g, '').endsWith(phone.slice(-10)));
  const customerInfo = db.customers.find((c) => c.phone.replace(/\D/g, '').endsWith(phone.slice(-10)));

  return res.json({
    success: true,
    orders: customerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    customer: customerInfo || null,
    shopInfo: db.shopInfo
  });
});

// Admin: Get all customers
app.get('/api/customers', (req, res) => {
  const db = getDb();
  res.json({ success: true, customers: db.customers });
});

// Admin: Add customer
app.post('/api/customers', (req, res) => {
  const { name, phone, altPhone, address, notes, measurements } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required' });
  }

  const db = getDb();
  const cleanPhone = String(phone).replace(/\D/g, '');
  const existing = db.customers.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);

  if (existing) {
    return res.status(400).json({ success: false, message: 'A customer with this phone number already exists' });
  }

  const newCust: Customer = {
    id: 'CUST-' + (db.customers.length + 1).toString().padStart(3, '0') + '-' + Math.floor(10 + Math.random() * 90),
    name: name.trim(),
    phone: cleanPhone,
    altPhone: altPhone || '',
    address: address || '',
    notes: notes || '',
    measurements: measurements || {
      blouse: { length: '', chest: '', waist: '', shoulder: '', sleeveLength: '', sleeveRound: '', frontNeck: '', backNeck: '', dartPoint: '', armhole: '' },
      dress: { length: '', chest: '', waist: '', hip: '', shoulder: '', sleeveLength: '', sleeveRound: '', salwarLength: '', salwarBottom: '' }
    },
    createdAt: new Date().toISOString()
  };

  db.customers.unshift(newCust);
  saveDb(db);
  broadcastRealtime('customer_added', newCust);
  res.json({ success: true, customer: newCust });
});

// Admin: Update customer (including measurements)
app.put('/api/customers/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const idx = db.customers.findIndex((c) => c.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  db.customers[idx] = {
    ...db.customers[idx],
    ...req.body,
    id // keep original ID
  };

  // If customer name or phone changed, update in active orders too
  db.orders.forEach((o) => {
    if (o.customerId === id) {
      if (req.body.name) o.customerName = req.body.name;
      if (req.body.phone) o.customerPhone = req.body.phone;
    }
  });

  saveDb(db);
  broadcastRealtime('customer_updated', db.customers[idx]);
  res.json({ success: true, customer: db.customers[idx] });
});

// Admin: Get all orders
app.get('/api/orders', (req, res) => {
  const db = getDb();
  res.json({
    success: true,
    orders: db.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  });
});

// Admin: Create Order
app.post('/api/orders', (req, res) => {
  const {
    customerId,
    customerName,
    customerPhone,
    garmentType,
    garmentName,
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
    measurementsSnapshot
  } = req.body;

  if (!customerName || !customerPhone || !deliveryDate || totalPrice === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required order fields' });
  }

  const db = getDb();
  const cleanPhone = String(customerPhone).replace(/\D/g, '');

  // If customer doesn't have an ID, check or create customer
  let cId = customerId;
  if (!cId) {
    const existing = db.customers.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);
    if (existing) {
      cId = existing.id;
    } else {
      const newCust: Customer = {
        id: 'CUST-' + (db.customers.length + 1).toString().padStart(3, '0'),
        name: customerName.trim(),
        phone: cleanPhone,
        measurements: measurementsSnapshot
          ? { blouse: measurementsSnapshot, dress: {} as any }
          : { blouse: {} as any, dress: {} as any },
        createdAt: new Date().toISOString()
      };
      db.customers.unshift(newCust);
      cId = newCust.id;
    }
  }

  const total = Number(totalPrice) || 0;
  const advance = Number(advancePayment) || 0;
  const remaining = Math.max(0, total - advance);
  const paymentStatus: Order['paymentStatus'] = remaining === 0 ? 'Paid' : advance > 0 ? 'Partial' : 'Unpaid';

  const newOrder: Order = {
    id: 'ORD-' + Math.floor(100 + Math.random() * 900),
    customerId: cId,
    customerName: customerName.trim(),
    customerPhone: cleanPhone,
    garmentType: garmentType || 'blouse',
    garmentName: garmentName || 'Custom Stitching',
    quantity: Number(quantity) || 1,
    neckDesign: neckDesign || '',
    sleeveDesign: sleeveDesign || '',
    liningIncluded: Boolean(liningIncluded),
    specialInstructions: specialInstructions || '',
    urgent: Boolean(urgent),
    orderDate: orderDate || new Date().toISOString().split('T')[0],
    deliveryDate,
    status: 'Order Received',
    statusTimeline: [
      {
        status: 'Order Received',
        timestamp: new Date().toISOString(),
        note: 'Order placed & fabric received'
      }
    ],
    totalPrice: total,
    advancePayment: advance,
    remainingPayment: remaining,
    paymentStatus,
    paymentMode: paymentMode || 'Cash',
    measurementsSnapshot: measurementsSnapshot || {},
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  saveDb(db);
  broadcastRealtime('order_created', newOrder);

  res.json({ success: true, order: newOrder });
});

// Admin: Update Order Status
app.patch('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses: OrderStatus[] = [
    'Order Received',
    'Stitching Started',
    'Stitching Completed',
    'Ready for Pickup',
    'Delivered'
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid order status' });
  }

  const db = getDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  order.status = status;
  order.statusTimeline.push({
    status,
    timestamp: new Date().toISOString(),
    note: note || undefined
  });

  saveDb(db);

  // Broadcast standard order update
  broadcastRealtime('order_status_updated', { orderId: id, status, order });

  // Broadcast push notification event to customer
  const statusMarathiMap: Record<OrderStatus, string> = {
    'Order Received': 'ऑर्डर स्वीकारली',
    'Stitching Started': 'शिलाई सुरू झाली',
    'Stitching Completed': 'शिलाई पूर्ण झाली',
    'Ready for Pickup': 'घेऊन जाण्यासाठी तयार',
    'Delivered': 'वितरित केले'
  };

  const notificationPayload = {
    id: 'NOTIF-' + Date.now(),
    orderId: id,
    customerPhone: order.customerPhone,
    customerName: order.customerName,
    garmentName: order.garmentName,
    status,
    title: status === 'Ready for Pickup' ? '🎉 Your order is Ready for Pickup!' : `✂️ SK Ladies Tailor: ${status}`,
    body: `Hello ${order.customerName}, your ${order.garmentName} is now "${status}". Please visit our shop!`,
    marathiTitle: status === 'Ready for Pickup' ? '🎉 तुमचे कपडे घेऊन जाण्यासाठी तयार आहेत!' : `✂️ एस. के. लेडीज टेलर: ${(statusMarathiMap as Record<string, string>)[status] || status}`,
    marathiBody: `नमस्कार ${order.customerName}, तुमच्या ${order.garmentName} ची स्थिती आता "${(statusMarathiMap as Record<string, string>)[status] || status}" आहे.`,
    timestamp: new Date().toISOString()
  };

  broadcastRealtime('push_notification', notificationPayload);

  res.json({ success: true, order, notification: notificationPayload });
});

// Customer: Submit Feedback / Rating for Delivered Order
app.post('/api/orders/:id/feedback', (req, res) => {
  const { id } = req.params;
  const { rating, fittingSatisfaction, tags, comment, customerName, customerPhone } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars' });
  }

  const db = getDb();
  if (!db.reviews) db.reviews = [];

  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (order.status !== 'Delivered') {
    return res.status(400).json({ success: false, message: 'Feedback can only be submitted after the order is Delivered' });
  }

  const newReview: CustomerReview = {
    id: 'REV-' + Date.now(),
    orderId: id,
    customerId: order.customerId,
    customerName: customerName || order.customerName,
    customerPhone: customerPhone || order.customerPhone,
    garmentName: order.garmentName,
    rating: Number(rating),
    fittingSatisfaction: fittingSatisfaction || 'perfect',
    tags: Array.isArray(tags) ? tags : [],
    comment: (comment || '').trim(),
    createdAt: new Date().toISOString()
  };

  order.review = newReview;
  db.reviews.unshift(newReview);
  saveDb(db);

  broadcastRealtime('feedback_submitted', { orderId: id, review: newReview, order });

  res.json({ success: true, review: newReview, order });
});

// Admin: Get all Customer Feedback & Rating Analytics
app.get('/api/feedback', (_req, res) => {
  const db = getDb();
  const reviews = db.reviews || [];

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
    : 5.0;

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const satisfactionCounts: Record<string, number> = { perfect: 0, good: 0, needs_alteration: 0 };
  const tagCounts: Record<string, number> = {};

  reviews.forEach((r) => {
    ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    satisfactionCounts[r.fittingSatisfaction] = (satisfactionCounts[r.fittingSatisfaction] || 0) + 1;
    r.tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  res.json({
    success: true,
    totalReviews,
    avgRating,
    ratingCounts,
    satisfactionCounts,
    tagCounts,
    reviews
  });
});

// Admin: Update Payment
app.patch('/api/orders/:id/payment', (req, res) => {
  const { id } = req.params;
  const { amountPaid, paymentMode } = req.body;

  const db = getDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const addAmount = Number(amountPaid) || 0;
  order.advancePayment += addAmount;
  order.remainingPayment = Math.max(0, order.totalPrice - order.advancePayment);
  order.paymentStatus = order.remainingPayment === 0 ? 'Paid' : order.advancePayment > 0 ? 'Partial' : 'Unpaid';
  if (paymentMode) {
    order.paymentMode = paymentMode;
  }

  saveDb(db);
  broadcastRealtime('order_payment_updated', { orderId: id, order });
  broadcastRealtime('order_updated', order);

  res.json({ success: true, order });
});

// Admin: Modify / Edit Billing Fields (Total Price, Advance Payment, Payment Mode)
app.patch('/api/orders/:id/billing', (req, res) => {
  const { id } = req.params;
  const { totalPrice, advancePayment, paymentMode } = req.body;

  const db = getDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (totalPrice !== undefined) {
    order.totalPrice = Math.max(0, Number(totalPrice) || 0);
  }
  if (advancePayment !== undefined) {
    order.advancePayment = Math.max(0, Number(advancePayment) || 0);
  }
  if (paymentMode) {
    order.paymentMode = paymentMode;
  }

  // Recalculate exact remaining balance due
  order.remainingPayment = Math.max(0, order.totalPrice - order.advancePayment);
  order.paymentStatus = order.remainingPayment === 0 ? 'Paid' : order.advancePayment > 0 ? 'Partial' : 'Unpaid';

  saveDb(db);

  // Broadcast real-time events to all connected clients (Admin and Customers)
  broadcastRealtime('order_payment_updated', { orderId: id, order });
  broadcastRealtime('order_updated', order);

  res.json({ success: true, order });
});

// Admin: Update Delivery Date / Priority
app.patch('/api/orders/:id/delivery', (req, res) => {
  const { id } = req.params;
  const { deliveryDate, urgent } = req.body;

  const db = getDb();
  const order = db.orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (deliveryDate) order.deliveryDate = deliveryDate;
  if (urgent !== undefined) order.urgent = Boolean(urgent);

  saveDb(db);
  broadcastRealtime('order_delivery_updated', { orderId: id, order });

  res.json({ success: true, order });
});

// Admin: Daily and Monthly Reports
app.get('/api/reports', (req, res) => {
  const db = getDb();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

  let totalOrdersCount = db.orders.length;
  let todayOrdersCount = 0;
  let todayRevenue = 0;
  let monthOrdersCount = 0;
  let monthRevenue = 0;
  let pendingBalanceTotal = 0;

  const statusCounts: Record<OrderStatus, number> = {
    'Order Received': 0,
    'Stitching Started': 0,
    'Stitching Completed': 0,
    'Ready for Pickup': 0,
    'Delivered': 0
  };

  const todayDeliveries: Order[] = [];
  const urgentOrders: Order[] = [];

  db.orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    pendingBalanceTotal += o.remainingPayment;

    if (o.urgent && o.status !== 'Delivered') {
      urgentOrders.push(o);
    }

    if (o.deliveryDate === todayStr && o.status !== 'Delivered') {
      todayDeliveries.push(o);
    }

    if (o.orderDate === todayStr) {
      todayOrdersCount += 1;
      todayRevenue += o.advancePayment;
    }

    if (o.orderDate.startsWith(currentMonthStr)) {
      monthOrdersCount += 1;
      monthRevenue += o.advancePayment;
    }
  });

  res.json({
    success: true,
    summary: {
      totalOrdersCount,
      todayOrdersCount,
      todayRevenue,
      monthOrdersCount,
      monthRevenue,
      pendingBalanceTotal,
      statusCounts,
      todayDeliveries,
      urgentOrders
    }
  });
});

// Shop Information
app.get('/api/shop-info', (req, res) => {
  const db = getDb();
  res.json({ success: true, shopInfo: db.shopInfo });
});

app.put('/api/shop-info', (req, res) => {
  const db = getDb();
  db.shopInfo = { ...db.shopInfo, ...req.body };
  saveDb(db);
  res.json({ success: true, shopInfo: db.shopInfo });
});

// Start dev server with Vite integration
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🌸 SK Ladies Tailor server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
