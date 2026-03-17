import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @ApiOperation({ summary: 'Create Razorpay order for an existing TownBolt order' })
  async createRazorpayOrder(@CurrentUser() user: any, @Body('orderId') orderId: string) {
    return this.paymentsService.createRazorpayOrder(orderId, user.userId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Razorpay payment signature' })
  async verifyPayment(@Body() dto: any) {
    return this.paymentsService.verifyPayment(dto);
  }
}
