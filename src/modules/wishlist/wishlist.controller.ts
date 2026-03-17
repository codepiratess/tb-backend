import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wishlist' })
  async getWishlist(@CurrentUser() user: any) {
    return this.wishlistService.getWishlist(user.userId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  async addProduct(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.addProduct(user.userId, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  async removeProduct(@CurrentUser() user: any, @Param('productId') productId: string) {
    return this.wishlistService.removeProduct(user.userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear entire wishlist' })
  async clearWishlist(@CurrentUser() user: any) {
    return this.wishlistService.clearWishlist(user.userId);
  }
}
