import { 
  Injectable, Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import Razorpay from 'razorpay'
import * as crypto from 'crypto'
import { Order } from 
  '../orders/entities/order.entity'
import { CreatePaymentOrderDto } from 
  './dto/create-payment-order.dto'
import { VerifyPaymentDto } from 
  './dto/verify-payment.dto'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(
    PaymentsService.name
  )
  private razorpay: Razorpay

  constructor(
    private configService: ConfigService,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>(
        'RAZORPAY_KEY_ID'
      ),
      key_secret: this.configService.get<string>(
        'RAZORPAY_KEY_SECRET'
      ),
    })
  }

  async createRazorpayOrder(
    userId: string,
    dto: CreatePaymentOrderDto,
  ) {
    // Find the TownBolt order
    const order = await this.orderRepo
      .findOne({
        where: { 
          id: dto.orderId,
          userId: userId,
        },
      })

    if (!order) {
      throw new NotFoundException(
        'Order not found'
      )
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException(
        'Order is already paid'
      )
    }

    // Amount in paise (multiply by 100)
    const amountInPaise = Math.round(
      Number(order.totalAmount) * 100
    )

    this.logger.log(
      `Creating Razorpay order for 
       TownBolt order: ${order.orderNumber}, 
       amount: ₹${order.totalAmount}`
    )

    // Create Razorpay order
    const razorpayOrder = await this
      .razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          userId: userId,
        },
      })

    this.logger.log(
      `Razorpay order created: 
       ${razorpayOrder.id}`
    )

    // Save Razorpay order ID to our order
    await this.orderRepo.update(
      order.id,
      { razorpayOrderId: razorpayOrder.id }
    )

    return {
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      orderNumber: order.orderNumber,
      keyId: this.configService.get<string>(
        'RAZORPAY_KEY_ID'
      ),
      prefill: {
        name: (order.shippingAddress as any)
          ?.fullName || '',
        contact: (order.shippingAddress as any)
          ?.phone || '',
      },
    }
  }

  async verifyPayment(
    dto: VerifyPaymentDto,
  ) {
    this.logger.log(
      `Verifying payment: 
       ${dto.razorpayPaymentId}`
    )

    // STEP 1: Verify signature
    const body = dto.razorpayOrderId + 
      '|' + dto.razorpayPaymentId

    const expectedSignature = crypto
      .createHmac(
        'sha256',
        this.configService.get<string>(
          'RAZORPAY_KEY_SECRET'
        ),
      )
      .update(body.toString())
      .digest('hex')

    const isSignatureValid = 
      expectedSignature === dto.razorpaySignature

    if (!isSignatureValid) {
      this.logger.error(
        `Payment signature mismatch! 
         Expected: ${expectedSignature}
         Received: ${dto.razorpaySignature}`
      )
      throw new BadRequestException(
        'Payment verification failed. ' +
        'Invalid signature.'
      )
    }

    this.logger.log(
      `Signature verified ✅ for 
       payment: ${dto.razorpayPaymentId}`
    )

    // STEP 2: Find and update our order
    const order = await this.orderRepo
      .findOne({
        where: { id: dto.orderId },
      })

    if (!order) {
      throw new NotFoundException(
        'Order not found'
      )
    }

    // STEP 3: Update order as paid
    const statusHistory = Array.isArray(
      order.statusHistory
    ) ? [...order.statusHistory] : []

    statusHistory.push({
      status: 'confirmed',
      note: `Payment received via Razorpay. 
             Payment ID: ${dto.razorpayPaymentId}`,
      timestamp: new Date().toISOString(),
      updatedBy: 'razorpay',
    })

    await this.orderRepo.update(order.id, {
      paymentStatus: 'paid',
      status: 'confirmed',
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
      statusHistory,
    })

    this.logger.log(
      `Order ${order.orderNumber} marked 
       as PAID and CONFIRMED ✅`
    )

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentId: dto.razorpayPaymentId,
      message: 'Payment verified successfully',
    }
  }

  async handleWebhook(
    body: any,
    signature: string,
  ) {
    // Verify webhook signature
    const webhookSecret = this.configService
      .get<string>('RAZORPAY_WEBHOOK_SECRET')

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(body))
      .digest('hex')

    if (expectedSignature !== signature) {
      this.logger.error(
        'Webhook signature mismatch'
      )
      throw new BadRequestException(
        'Invalid webhook signature'
      )
    }

    const event = body.event
    this.logger.log(
      `Razorpay webhook received: ${event}` 
    )

    // Handle different events
    switch (event) {
      case 'payment.captured':
        await this.handlePaymentCaptured(
          body.payload.payment.entity
        )
        break
      case 'payment.failed':
        await this.handlePaymentFailed(
          body.payload.payment.entity
        )
        break
      default:
        this.logger.log(
          `Unhandled webhook event: ${event}` 
        )
    }

    return { received: true }
  }

  private async handlePaymentCaptured(
    payment: any
  ) {
    const orderNumber = payment.receipt
    if (!orderNumber) return

    const order = await this.orderRepo
      .findOne({ 
        where: { orderNumber } 
      })
    if (!order) return

    if (order.paymentStatus !== 'paid') {
      await this.orderRepo.update(order.id, {
        paymentStatus: 'paid',
        status: 'confirmed',
        razorpayPaymentId: payment.id,
      })
      this.logger.log(
        `Payment captured for order: 
         ${orderNumber}`
      )
    }
  }

  private async handlePaymentFailed(
    payment: any
  ) {
    const orderNumber = payment.receipt
    if (!orderNumber) return

    const order = await this.orderRepo
      .findOne({ 
        where: { orderNumber } 
      })
    if (!order) return

    await this.orderRepo.update(order.id, {
      paymentStatus: 'failed',
    })
    this.logger.warn(
      `Payment failed for order: 
       ${orderNumber}`
    )
  }
}
