import { Entity, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus, PaymentStatus } from '../../../common/enums/order-status.enum';

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ unique: true })
  @Index()
  orderNumber: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  @Index()
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column()
  paymentMethod: string;

  @Column({ nullable: true })
  razorpayOrderId: string;

  @Column({ nullable: true })
  razorpayPaymentId: string;

  @Column({ nullable: true })
  razorpaySignature: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deliveryCharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column('jsonb')
  shippingAddress: any; // Snapshot of address

  @Column({ nullable: true })
  notes: string;

  @Column({ nullable: true })
  cancelReason: string;

  @Column({ nullable: true })
  estimatedDelivery: Date;

  @Column({ nullable: true })
  deliveredAt: Date;

  @Column({ nullable: true })
  shippedAt: Date;

  @Column('jsonb', { array: true, default: [] })
  statusHistory: {
    status: OrderStatus;
    note?: string;
    updatedBy: string;
    timestamp: string;
  }[];

  @ManyToOne(() => User, (user) => user.orders)
  user: User;

  @OneToMany(() => OrderItem, (item) => item.order, { eager: true, cascade: true })
  items: OrderItem[];
}
