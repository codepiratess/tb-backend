import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Address } from './entities/address.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
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
    const { page = 1, limit = 20, search } = pagination;
    const query = this.userRepository.createQueryBuilder('user')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      query.where('user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await query.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
