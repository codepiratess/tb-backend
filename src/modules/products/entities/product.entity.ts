import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Category } from '../../categories/entities/category.entity';
import { ProductSpecification } from './product-specification.entity';
import { Review } from '../../reviews/entities/review.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

@Entity('products')
@Index(['isActive', 'isFeatured'])
@Index(['isActive', 'category'])
@Index(['isActive', 'createdAt'])
export class Product extends BaseEntity {
  @Column()
  @Index()
  name: string;

  @Column({ unique: true })
  @Index()
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  shortDescription: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  originalPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount: number;

  @Column({ unique: true, nullable: true })
  sku: string;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 10 })
  lowStockThreshold: number;

  @Column('text', { array: true, default: [] })
  images: string[];

  @Column('text', { array: true, default: [] })
  tags: string[];

  @Column({ default: false })
  @Index()
  isFeatured: boolean;

  @Column({ default: true })
  @Index()
  isActive: boolean;

  @Column({ default: false })
  isNewArrival: boolean;

  @Column({ default: false })
  freeDelivery: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ type: 'int', default: 0 })
  reviewCount: number;

  @Column({ type: 'int', default: 0 })
  soldCount: number;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'decimal', nullable: true })
  weight: number;

  @Column('jsonb', { nullable: true })
  dimensions: { length: number; width: number; height: number };

  // RELATIONS
  @ManyToOne(() => Category, (category) => category.products)
  category: Category;

  @OneToMany(() => ProductSpecification, (spec) => spec.product, { cascade: true })
  specifications: ProductSpecification[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];
}
