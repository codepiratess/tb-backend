import { Entity, Column, OneToMany, OneToOne, Index, AfterLoad } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../../common/enums/role.enum';
import { Address } from './address.entity';
import { Wishlist } from '../../wishlist/entities/wishlist.entity';
import { Order } from '../../orders/entities/order.entity';
import { Review } from '../../reviews/entities/review.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ unique: true, nullable: true })
  @Index()
  email: string;

  @Column({ unique: true, nullable: true })
  @Index()
  phone: string;

  @Column({ nullable: true, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.CUSTOMER })
  role: Role;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ default: false })
  isPhoneVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ nullable: true, select: false })
  refreshTokenHash: string | null;

  @Column({ nullable: true, select: false })
  otpHash: string | null;

  @Column({ nullable: true })
  otpExpiry: Date | null;

  @Column({ nullable: true, select: false })
  passwordResetToken: string | null;

  @Column({ nullable: true })
  passwordResetExpiry: Date | null;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  fcmToken: string;

  @Column('text', { array: true, default: [] })
  deviceTokens: string[];

  // RELATIONS
  @OneToMany(() => Address, (address) => address.user)
  addresses: Address[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToOne(() => Wishlist, (wishlist) => wishlist.user)
  wishlist: Wishlist;

  toJSON() {
    const user = this as any;
    delete user.passwordHash;
    delete user.refreshTokenHash;
    delete user.otpHash;
    delete user.otpExpiry;
    delete user.passwordResetToken;
    delete user.passwordResetExpiry;
    return user;
  }
}
