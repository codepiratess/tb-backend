import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { Order } from '../orders/entities/order.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { PaymentStatus } from '../../common/enums/order-status.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['addresses'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    await this.userRepository.update(userId, dto);
    return this.findOne(userId);
  }

  async addAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    const user = await this.findOne(userId);
    
    if (dto.isDefault) {
      await this.addressRepository.update({ user: { id: userId } }, { isDefault: false });
    }

    const address = this.addressRepository.create({
      ...dto,
      user,
    });
    return this.addressRepository.save(address);
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { user: { id: userId } },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    await this.addressRepository.update({ user: { id: userId } }, { isDefault: false });
    const result = await this.addressRepository.update(
      { id: addressId, user: { id: userId } },
      { isDefault: true },
    );
    if (result.affected === 0) throw new NotFoundException('Address not found');
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const result = await this.addressRepository.softDelete({
      id: addressId,
      user: { id: userId },
    });
    if (result.affected === 0) throw new NotFoundException('Address not found');
  }

  async findAll(pagination: any) {
    const { 
      page = 1, 
      limit = 20, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = pagination;

    const query = this.userRepository.createQueryBuilder('user')
      .where('user.role = :role', { role: 'customer' })
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`user.${sortBy}`, sortOrder as any);

    if (search) {
      query.andWhere('(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR user.phone ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [users, total] = await query.getManyAndCount();

    // Add order count and total spend per user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orderCount = await this.orderRepository.count({
          where: { user: { id: user.id } }
        });

        const totalSpendResult = await this.orderRepository
          .createQueryBuilder('order')
          .where('order.user.id = :userId', { userId: user.id })
          .andWhere('order.paymentStatus = :status', { status: PaymentStatus.PAID })
          .select('SUM(order.totalAmount)', 'total')
          .getRawOne();

        return {
          ...user,
          orderCount,
          totalSpend: parseFloat(totalSpendResult?.total || '0'),
        };
      })
    );

    return {
      data: usersWithStats,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }
}
