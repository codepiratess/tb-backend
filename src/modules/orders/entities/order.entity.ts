import {
  Entity, Column, ManyToOne,
  OneToMany, JoinColumn,
} from 'typeorm'
import { BaseEntity } from 
  '../../../common/entities/base.entity'
import { User } from 
  '../../users/entities/user.entity'
import { OrderItem } from 
  './order-item.entity'

@Entity('orders')
export class Order extends BaseEntity {

  @Column({ unique: true })
  orderNumber: string

  @Column()
  userId: string

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  @Column({ default: 'pending' })
  status: string

  @Column({ default: 'pending' })
  paymentStatus: string

  @Column()
  paymentMethod: string

  @Column({ nullable: true })
  razorpayOrderId: string

  @Column({ nullable: true })
  razorpayPaymentId: string

  @Column({ nullable: true, type: 'text' })
  razorpaySignature: string

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2 
  })
  subtotal: number

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    default: 0 
  })
  discount: number

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2,
    default: 0 
  })
  deliveryCharge: number

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2 
  })
  totalAmount: number

  @Column({ type: 'jsonb' })
  shippingAddress: object

  @Column({ nullable: true, type: 'text' })
  notes: string

  @Column({ nullable: true, type: 'text' })
  cancelReason: string

  @Column({ 
    nullable: true, 
    type: 'timestamp' 
  })
  estimatedDelivery: Date

  @Column({ 
    nullable: true, 
    type: 'timestamp' 
  })
  deliveredAt: Date

  @Column({ 
    nullable: true, 
    type: 'timestamp' 
  })
  shippedAt: Date

  @Column({ 
    type: 'jsonb', 
    default: () => "'[]'::jsonb"
  })
  statusHistory: any[]

  @OneToMany(
    () => OrderItem, 
    item => item.order,
    { eager: true, cascade: true }
  )
  items: OrderItem[]
}
