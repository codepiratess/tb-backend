export enum OrderStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  RAZORPAY = 'razorpay',
  COD = 'cod',
  UPI = 'upi',
  CARD = 'card',
  NETBANKING = 'netbanking',
}
