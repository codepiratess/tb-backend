import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('Wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist' })
  async getWishlist(@CurrentUser() user: any) {
    return {
      success: true,
      data: await this.wishlistService.getWishlist(user.userId),
    };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync local wishlist with server' })
  async syncWishlist(
    @CurrentUser() user: any,
    @Body() body: { productIds: string[] },
  ) {
    return {
      success: true,
      data: await this.wishlistService.syncWishlist(
        user.userId,
        body.productIds || [],
      ),
    };
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  async addProduct(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    return {
      success: true,
      data: await this.wishlistService.addProduct(user.userId, productId),
    };
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async removeProduct(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    return {
      success: true,
      data: await this.wishlistService.removeProduct(user.userId, productId),
    };
  }

  @Delete()
  @ApiOperation({ summary: 'Clear wishlist' })
  async clearWishlist(@CurrentUser() user: any) {
    return {
      success: true,
      data: await this.wishlistService.clearWishlist(user.userId),
    };
  }

  @Get('check/:productId')
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  async checkProduct(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    return {
      success: true,
      data: await this.wishlistService.checkProduct(user.userId, productId),
    };
  }
}
