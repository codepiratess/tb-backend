import { Entity, Column, OneToMany, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  @Index()
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  // Virtual field
  productCount: number;
}
