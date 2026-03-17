import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { PaymentStatus } from '../../common/enums/order-status.enum';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getDashboardStats() {
    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.paymentStatus = :status', { status: PaymentStatus.PAID })
      .select('SUM(order.totalAmount)', 'sum')
      .getRawOne();

    const totalOrders = await this.orderRepository.count();
    const totalProducts = await this.productRepository.count({ where: { isActive: true } });
    const totalCustomers = await this.userRepository.count({ where: { role: 'customer' as any } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = await this.orderRepository.count({
      where: { createdAt: Between(today, new Date()) },
    });

    return {
      totalRevenue: Number(totalRevenue.sum || 0),
      totalOrders,
      totalProducts,
      totalCustomers,
      todayOrders,
    };
  }

  async getRevenueChart(period: string) {
    // Simplified daily grouping
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select("DATE_TRUNC('day', order.createdAt)", 'date')
      .addSelect('SUM(order.totalAmount)', 'revenue')
      .addSelect('COUNT(order.id)', 'orders')
      .where('order.paymentStatus = :status', { status: PaymentStatus.PAID })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    return result;
  }
}
