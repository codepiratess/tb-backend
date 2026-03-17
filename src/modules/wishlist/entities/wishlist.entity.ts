import { Entity, OneToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('wishlists')
export class Wishlist extends BaseEntity {
  @OneToOne(() => User, (user) => user.wishlist)
  @JoinColumn()
  user: User;

  @ManyToMany(() => Product)
  @JoinTable({ name: 'wishlist_products' })
  products: Product[];
}
