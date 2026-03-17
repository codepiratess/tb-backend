import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus, PaymentStatus } from '../../common/enums/order-status.enum';
import { EmailService } from '../notifications/email/email.service';

@Injectable()
export class PaymentsService {
  private razorpay: any;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private emailService: EmailService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get('RAZORPAY_KEY_SECRET'),
    });
  }

  async createRazorpayOrder(orderId: string, userId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order already paid');
    }

    const options = {
      amount: Math.round(Number(order.totalAmount) * 100), // paise
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId, userId },
    };

    const rzpOrder = await this.razorpay.orders.create(options);

    await this.orderRepository.update(orderId, {
      razorpayOrderId: rzpOrder.id,
    });

    return {
      razorpayOrderId: rzpOrder.id,
      amount: options.amount,
      currency: options.currency,
      keyId: this.configService.get('RAZORPAY_KEY_ID'),
    };
  }

  async verifyPayment(dto: any) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', this.configService.getOrThrow('RAZORPAY_KEY_SECRET'))
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new BadRequestException('Invalid signature');
    }

    const order = await this.orderRepository.findOne({
      where: { razorpayOrderId: razorpay_order_id },
      relations: ['user'],
    });

    if (!order) throw new NotFoundException('Order not found');

    order.paymentStatus = PaymentStatus.PAID;
    order.status = OrderStatus.CONFIRMED;
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpaySignature = razorpay_signature;
    order.statusHistory.push({
      status: OrderStatus.CONFIRMED,
      note: 'Payment verified via Razorpay',
      updatedBy: 'system',
      timestamp: new Date().toISOString(),
    });

    await this.orderRepository.save(order);

    this.emailService.sendOrderConfirmedEmail(order.user, order).catch(() => {});

    return { success: true, order };
  }
}
