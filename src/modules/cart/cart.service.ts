import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async getCart(userId: string) {
    // Find or auto-create cart for user
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: [
        'items',
        'items.product',
        'items.product.category',
      ],
    });

    if (!cart) {
      cart = this.cartRepo.create({ userId });
      await this.cartRepo.save(cart);
      cart.items = [];
    }

    // Filter out items where product was deleted or deactivated
    const validItems = cart.items.filter(
      item => item.product && 
      item.product.isActive &&
      !item.product.deletedAt
    );

    return {
      id: cart.id,
      userId: cart.userId,
      items: validItems.map(item => ({
        id: item.id,
        product: item.product,
        quantity: item.quantity,
        addedAt: item.createdAt,
      })),
      itemCount: validItems.length,
      total: validItems.reduce(
        (sum, item) => sum + (Number(item.product.price) * item.quantity), 
        0
      ),
    };
  }

  async addItem(userId: string, productId: string, quantity: number = 1) {
    // Validate product exists
    const product = await this.productRepo.findOne({ 
      where: { id: productId, isActive: true } 
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate stock
    if (product.stock < quantity) {
      throw new BadRequestException(`Only ${product.stock} items in stock`);
    }

    // Get or create cart
    let cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items'],
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId }));
      cart.items = [];
    }

    // Check if item already in cart
    const existingItem = await this.cartItemRepo.findOne({
      where: { cartId: cart.id, productId },
    });

    if (existingItem) {
      // Update quantity
      const newQty = Math.min(
        existingItem.quantity + quantity,
        Math.min(product.stock, 10)
      );
      existingItem.quantity = newQty;
      await this.cartItemRepo.save(existingItem);
    } else {
      // Add new item
      await this.cartItemRepo.save(
        this.cartItemRepo.create({
          cartId: cart.id,
          productId,
          quantity: Math.min(quantity, Math.min(product.stock, 10)),
        })
      );
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, productId: string, quantity: number) {
    if (quantity <= 0) {
      return this.removeItem(userId, productId);
    }

    const cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items'],
    });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = await this.cartItemRepo.findOne({
      where: { cartId: cart.id, productId },
    });
    if (!item) {
      throw new NotFoundException('Item not in cart');
    }

    item.quantity = Math.min(quantity, 10);
    await this.cartItemRepo.save(item);
    return this.getCart(userId);
  }

  async removeItem(userId: string, productId: string) {
    const cart = await this.cartRepo.findOne({
      where: { userId },
      relations: ['items'],
    });
    if (!cart) return this.getCart(userId);

    await this.cartItemRepo.delete({
      cartId: cart.id,
      productId,
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.cartRepo.findOne({
      where: { userId },
    });
    if (cart) {
      await this.cartItemRepo.delete({ cartId: cart.id });
    }
    return this.getCart(userId);
  }

  async syncCart(userId: string, items: Array<{ productId: string; quantity: number }>) {
    // Get or create cart
    let cart = await this.cartRepo.findOne({
      where: { userId },
    });
    if (!cart) {
      cart = await this.cartRepo.save(this.cartRepo.create({ userId }));
    }

    // Process each item from client
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) continue;

      const product = await this.productRepo.findOne({ 
        where: { id: item.productId, isActive: true } 
      });
      if (!product) continue;

      const existing = await this.cartItemRepo.findOne({
        where: { cartId: cart.id, productId: item.productId },
      });

      if (existing) {
        // Keep the higher quantity
        existing.quantity = Math.min(
          Math.max(existing.quantity, item.quantity),
          10
        );
        await this.cartItemRepo.save(existing);
      } else {
        await this.cartItemRepo.save(
          this.cartItemRepo.create({
            cartId: cart.id,
            productId: item.productId,
            quantity: Math.min(item.quantity, 10),
          })
        );
      }
    }

    return this.getCart(userId);
  }
}
