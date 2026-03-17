import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

@Entity('addresses')
export class Address extends BaseEntity {
  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  addressLine1: string;

  @Column({ nullable: true })
  addressLine2: string;

  @Column({ nullable: true })
  landmark: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  pincode: string;

  @Column({
    type: 'enum',
    enum: ['home', 'work', 'other'],
    default: 'home',
  })
  addressType: string;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToOne(() => User, (user) => user.addresses)
  user: User;
}
