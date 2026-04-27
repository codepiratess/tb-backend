import {
  Entity, Column, ManyToOne, JoinColumn
} from 'typeorm'
import { BaseEntity } from 
  '../../../common/entities/base.entity'
import { Order } from './order.entity'
import { Product } from 
  '../../products/entities/product.entity'

@Entity('order_items')
export class OrderItem extends BaseEntity {

  @Column()
  orderId: string

  @ManyToOne(
    () => Order,
    order => order.items,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'orderId' })
  order: Order

  @Column({ nullable: true })
  productId: string

  @ManyToOne(() => Product, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'productId' })
  product: Product

  @Column({ type: 'int' })
  quantity: number

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2 
  })
  unitPrice: number

  @Column({ 
    type: 'decimal', 
    precision: 10, 
    scale: 2 
  })
  totalPrice: number

  @Column({ type: 'varchar', length: 200 })
  productName: string

  @Column({ nullable: true, type: 'text' })
  productImage: string

  @Column({ 
    nullable: true, 
    type: 'varchar', 
    length: 220 
  })
  productSlug: string
}
