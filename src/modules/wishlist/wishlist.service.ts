import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getWishlist(userId: string) {
    let wishlist = await this.wishlistRepo.findOne({
      where: { userId },
      relations: ['products', 'products.category'],
    });

    if (!wishlist) {
      wishlist = await this.wishlistRepo.save(this.wishlistRepo.create({ userId }));
      wishlist.products = [];
    }

    // Filter deleted/inactive products
    const validProducts = (wishlist.products || []).filter(
      (p) => p && p.isActive && !p.deletedAt,
    );

    return {
      id: wishlist.id,
      userId: wishlist.userId,
      products: validProducts,
      count: validProducts.length,
    };
  }

  async addProduct(userId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId, isActive: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let wishlist = await this.wishlistRepo.findOne({
      where: { userId },
      relations: ['products'],
    });

    if (!wishlist) {
      wishlist = await this.wishlistRepo.save(this.wishlistRepo.create({ userId }));
      wishlist.products = [];
    }

    const alreadyIn = wishlist.products.some((p) => p.id === productId);
    if (!alreadyIn) {
      wishlist.products.push(product);
      await this.wishlistRepo.save(wishlist);
    }

    return this.getWishlist(userId);
  }

  async removeProduct(userId: string, productId: string) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { userId },
      relations: ['products'],
    });

    if (!wishlist) return this.getWishlist(userId);

    wishlist.products = (wishlist.products || []).filter((p) => p.id !== productId);
    await this.wishlistRepo.save(wishlist);
    return this.getWishlist(userId);
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { userId },
    });
    if (wishlist) {
      wishlist.products = [];
      await this.wishlistRepo.save(wishlist);
    }
    return this.getWishlist(userId);
  }

  async checkProduct(userId: string, productId: string) {
    const wishlist = await this.wishlistRepo.findOne({
      where: { userId },
      relations: ['products'],
    });

    const isInWishlist =
      wishlist?.products?.some((p) => p.id === productId) || false;

    return { isInWishlist, productId };
  }

  async syncWishlist(userId: string, productIds: string[]) {
    let wishlist = await this.wishlistRepo.findOne({
      where: { userId },
      relations: ['products'],
    });

    if (!wishlist) {
      wishlist = await this.wishlistRepo.save(this.wishlistRepo.create({ userId }));
      wishlist.products = [];
    }

    for (const productId of productIds) {
      const product = await this.productRepo.findOne({
        where: { id: productId, isActive: true },
      });
      if (!product) continue;

      const exists = wishlist.products.some((p) => p.id === productId);
      if (!exists) {
        wishlist.products.push(product);
      }
    }

    await this.wishlistRepo.save(wishlist);
    return this.getWishlist(userId);
  }
}
