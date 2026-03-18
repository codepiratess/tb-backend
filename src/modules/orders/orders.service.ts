import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { Address } from '../users/entities/address.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../../common/enums/order-status.enum';
import { EmailService } from '../notifications/email/email.service';
import { SmsService } from '../notifications/sms/sms.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate Address
      const address = await this.addressRepository.findOne({
        where: { id: dto.addressId, user: { id: userId } },
      });
      if (!address) throw new NotFoundException('Shipping address not found');

      let subtotal = 0;
      const orderItems: OrderItem[] = [];

      // 2. Process Items
      for (const itemDto of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.productId, isActive: true },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) throw new NotFoundException(`Product ${itemDto.productId} not found`);
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(`Insufficient stock for ${product.name}`);
        }

        const unitPrice = Number(product.price);
        const totalPrice = unitPrice * itemDto.quantity;
        subtotal += totalPrice;

        const orderItem = queryRunner.manager.create(OrderItem, {
          product,
          quantity: itemDto.quantity,
          unitPrice,
          totalPrice,
          productName: product.name,
          productImage: product.images[0],
          productSlug: product.slug,
        });

        orderItems.push(orderItem);

        // Update stock and sold count
        product.stock -= itemDto.quantity;
        product.soldCount += itemDto.quantity;
        await queryRunner.manager.save(product);
      }

      // 3. Totals
      const deliveryCharge = subtotal > 499 ? 0 : 40;
      const totalAmount = subtotal + deliveryCharge;

      // 4. Create Order
      const orderNumber = `TB${Date.now()}${Math.floor(100 + Math.random() * 900)}`;
      const order = queryRunner.manager.create(Order, {
        user: { id: userId } as any,
        orderNumber,
        subtotal,
        deliveryCharge,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        status: dto.paymentMethod === PaymentMethod.COD ? OrderStatus.PENDING : OrderStatus.AWAITING_PAYMENT,
        paymentStatus: PaymentStatus.PENDING,
        shippingAddress: address,
        notes: dto.notes,
        statusHistory: [
          {
            status: dto.paymentMethod === PaymentMethod.COD ? OrderStatus.PENDING : OrderStatus.AWAITING_PAYMENT,
            updatedBy: 'system',
            timestamp: new Date().toISOString(),
          },
        ],
      });

      const savedOrder = await queryRunner.manager.save(order);

      // 5. Save Items
      for (const item of orderItems) {
        item.order = savedOrder;
        await queryRunner.manager.save(item);
      }

      await queryRunner.commitTransaction();

      // Async Notifications
      this.emailService.sendOrderConfirmedEmail(userId, savedOrder).catch(() => {});
      this.smsService.sendOrderSMS(address.phone, savedOrder.orderNumber, 'CONFIRMED').catch(() => {});

      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findUserOrders(userId: string, pagination: any) {
    const { page = 1, limit = 20 } = pagination;
    const [data, total] = await this.orderRepository.findAndCount({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['items'],
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string) {
    const where = userId ? { id, user: { id: userId } } : { id };
    const order = await this.orderRepository.findOne({
      where,
      relations: ['items', 'user'],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, note?: string, adminId?: string) {
    const order = await this.findOne(id);
    
    order.status = status;
    if (status === OrderStatus.DELIVERED) {
      order.deliveredAt = new Date();
      if (order.paymentMethod === PaymentMethod.COD) {
        order.paymentStatus = PaymentStatus.PAID;
      }
    } else if (status === OrderStatus.SHIPPED) {
      order.shippedAt = new Date();
    }

    order.statusHistory.push({
      status,
      note,
      updatedBy: adminId || 'admin',
      timestamp: new Date().toISOString(),
    });

    const updated = await this.orderRepository.save(order);
    
    // Notification
    this.emailService.sendOrderShippedEmail(order.user, updated).catch(() => {});

    return updated;
  }

  async findAllAdmin(filters: any) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      paymentStatus,
      dateRange, // 'today', 'yesterday', 'week', 'month'
      groupByStatus,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    if (groupByStatus) {
      const counts = await this.orderRepository
        .createQueryBuilder('order')
        .select('order.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('order.status')
        .getRawMany();
      
      const total = await this.orderRepository.count();
      
      return {
        all: Number(total),
        pending: Number(counts.find(c => c.status === OrderStatus.PENDING)?.count || 0),
        confirmed: Number(counts.find(c => c.status === OrderStatus.CONFIRMED)?.count || 0),
        shipped: Number(counts.find(c => c.status === OrderStatus.SHIPPED)?.count || 0),
        delivered: Number(counts.find(c => c.status === OrderStatus.DELIVERED)?.count || 0),
        cancelled: Number(counts.find(c => c.status === OrderStatus.CANCELLED)?.count || 0),
      };
    }

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.deletedAt IS NULL');

    if (status && status !== 'all') {
      qb.andWhere('order.status = :status', { status });
    }

    if (paymentStatus) {
      qb.andWhere('order.paymentStatus = :paymentStatus', { paymentStatus });
    }

    if (search) {
      qb.andWhere(
        '(order.orderNumber ILIKE :search OR user.firstName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (dateRange) {
      const now = new Date();
      let startDate: Date;
      if (dateRange === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        qb.andWhere('order.createdAt >= :startDate', { startDate });
      } else if (dateRange === 'week') {
        startDate = new Date(now.setDate(now.getDate() - 7));
        qb.andWhere('order.createdAt >= :startDate', { startDate });
      } else if (dateRange === 'month') {
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        qb.andWhere('order.createdAt >= :startDate', { startDate });
      }
    }

    const [data, total] = await qb
      .orderBy(`order.${sortBy}`, sortOrder as any)
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }
}
