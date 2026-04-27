import {
  Controller, Post, Body, Headers,
  UseGuards, Logger, RawBodyRequest,
  Req, HttpCode,
} from '@nestjs/common'
import { 
  ApiTags, ApiBearerAuth, 
  ApiOperation 
} from '@nestjs/swagger'
import { PaymentsService } from 
  './payments.service'
import { JwtAuthGuard } from 
  '../../common/guards/jwt-auth.guard'
import { CurrentUser } from 
  '../../common/decorators/current-user.decorator'
import { Public } from 
  '../../common/decorators/public.decorator'
import { CreatePaymentOrderDto } from 
  './dto/create-payment-order.dto'
import { VerifyPaymentDto } from 
  './dto/verify-payment.dto'

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(
    PaymentsController.name
  )

  constructor(
    private paymentsService: PaymentsService
  ) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Create Razorpay payment order' 
  })
  async createOrder(
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentOrderDto,
  ) {
    this.logger.log(
      `Creating payment order for 
       user: ${user.id}, 
       order: ${dto.orderId}`
    )
    return this.paymentsService
      .createRazorpayOrder(user.id, dto)
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Verify Razorpay payment' 
  })
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService
      .verifyPayment(dto)
  }

  @Post('webhook')
  @Public()
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Razorpay webhook handler' 
  })
  async handleWebhook(
    @Body() body: any,
    @Headers('x-razorpay-signature') 
      signature: string,
  ) {
    this.logger.log(
      `Webhook received, event: ${body.event}` 
    )
    return this.paymentsService
      .handleWebhook(body, signature)
  }
}
