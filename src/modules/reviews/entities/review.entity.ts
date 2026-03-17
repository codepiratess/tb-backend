import { Entity, Column, ManyToOne, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('reviews')
@Unique(['user', 'product'])
export class Review extends BaseEntity {
  @Column({ type: 'int' })
  @Index()
  rating: number;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text' })
  comment: string;

  @Column('text', { array: true, default: [] })
  images: string[];

  @Column({ default: false })
  isVerifiedPurchase: boolean;

  @Column({ default: false })
  @Index()
  isApproved: boolean;

  @Column({ type: 'int', default: 0 })
  helpfulCount: number;

  @ManyToOne(() => User, (user) => user.reviews)
  user: User;

  @ManyToOne(() => Product, (product) => product.reviews)
  product: Product;

  @ManyToOne(() => Order, { nullable: true })
  order: Order;
}
