import { Entity, Column, OneToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('wishlists')
export class Wishlist extends BaseEntity {
  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.wishlist)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToMany(() => Product)
  @JoinTable({ name: 'wishlist_products' })
  products: Product[];
}
