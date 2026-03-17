import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from './product.entity';

@Entity('product_specifications')
export class ProductSpecification extends BaseEntity {
  @Column()
  key: string;

  @Column()
  value: string;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => Product, (product) => product.specifications, {
    onDelete: 'CASCADE',
  })
  product: Product;
}
