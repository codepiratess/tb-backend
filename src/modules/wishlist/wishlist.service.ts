import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getWishlist(userId: string): Promise<Wishlist> {
    let wishlist = await this.wishlistRepository.findOne({
      where: { user: { id: userId } },
      relations: ['products'],
    });

    if (!wishlist) {
      wishlist = this.wishlistRepository.create({
        user: { id: userId } as any,
        products: [],
      });
      await this.wishlistRepository.save(wishlist);
    }

    return wishlist;
  }

  async addProduct(userId: string, productId: string): Promise<Wishlist> {
    const wishlist = await this.getWishlist(userId);
    const product = await this.productRepository.findOne({ where: { id: productId } });

    if (!product) throw new NotFoundException('Product not found');

    if (!wishlist.products.some((p) => p.id === productId)) {
      wishlist.products.push(product);
      return this.wishlistRepository.save(wishlist);
    }

    return wishlist;
  }

  async removeProduct(userId: string, productId: string): Promise<Wishlist> {
    const wishlist = await this.getWishlist(userId);
    wishlist.products = wishlist.products.filter((p) => p.id !== productId);
    return this.wishlistRepository.save(wishlist);
  }

  async clearWishlist(userId: string): Promise<void> {
    const wishlist = await this.getWishlist(userId);
    wishlist.products = [];
    await this.wishlistRepository.save(wishlist);
  }
}
