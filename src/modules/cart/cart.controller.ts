import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  async getCart(@CurrentUser() user: any) {
    return {
      success: true,
      data: await this.cartService.getCart(user.userId),
    };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(
    @CurrentUser() user: any,
    @Body() body: { productId: string; quantity?: number },
  ) {
    return {
      success: true,
      data: await this.cartService.addItem(
        user.userId,
        body.productId,
        body.quantity || 1,
      ),
    };
  }

  @Put('items/:productId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateItem(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    return {
      success: true,
      data: await this.cartService.updateItem(
        user.userId,
        productId,
        body.quantity,
      ),
    };
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    return {
      success: true,
      data: await this.cartService.removeItem(user.userId, productId),
    };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  async clearCart(@CurrentUser() user: any) {
    return {
      success: true,
      data: await this.cartService.clearCart(user.userId),
    };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync local cart with server' })
  async syncCart(
    @CurrentUser() user: any,
    @Body() body: { items: Array<{ productId: string; quantity: number }> },
  ) {
    return {
      success: true,
      data: await this.cartService.syncCart(user.userId, body.items || []),
    };
  }
}
