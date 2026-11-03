export type Language = 'mr' | 'en';

export type UserRole = 'admin' | 'customer' | 'guest';

export type OrderStatus =
  | 'Order Received'
  | 'Stitching Started'
  | 'Stitching Completed'
  | 'Ready for Pickup'
  | 'Delivered';

export interface BlouseMeasurements {
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
}

export interface DressMeasurements {
  length: string;
  chest: string;
  waist: string;
  hip: string;
  shoulder: string;
  sleeveLength: string;
  sleeveRound: string;
  salwarLength: string;
  salwarBottom: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  address?: string;
  notes?: string;
  measurements: {
    blouse: BlouseMeasurements;
    dress: DressMeasurements;
  };
  createdAt: string;
}

export interface StatusTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface CustomerReview {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  garmentName: string;
  rating: number; // 1-5
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
  statusTimeline: StatusTimelineEntry[];
  totalPrice: number;
  advancePayment: number;
  remainingPayment: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  paymentMode: 'Cash' | 'PhonePe / GPay (UPI)';
  measurementsSnapshot: Partial<BlouseMeasurements & DressMeasurements>;
  review?: CustomerReview;
  createdAt: string;
}

export interface ShopInfo {
  name: string;
  marathiName: string;
  tagline: string;
  ownerName: string;
  phone: string;
  address: string;
  upiId: string;
}

export interface BusinessReports {
  totalOrdersCount: number;
  todayOrdersCount: number;
  todayRevenue: number;
  monthOrdersCount: number;
  monthRevenue: number;
  pendingBalanceTotal: number;
  statusCounts: Record<OrderStatus, number>;
  todayDeliveries: Order[];
  urgentOrders: Order[];
}
