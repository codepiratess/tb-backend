import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(userId: string, dto: CreateReviewDto): Promise<Review> {
    const product = await this.productRepository.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Check if user already reviewed
    const existing = await this.reviewRepository.findOne({
      where: { user: { id: userId }, product: { id: dto.productId } },
    });
    if (existing) throw new BadRequestException('You have already reviewed this product');

    // Check for verified purchase
    const order = await this.orderRepository.findOne({
      where: { user: { id: userId }, items: { product: { id: dto.productId } } },
    });

    const review = this.reviewRepository.create({
      ...dto,
      user: { id: userId } as any,
      product,
      isVerifiedPurchase: !!order,
      isApproved: false, // Needs admin approval
    });

    return this.reviewRepository.save(review);
  }

  async findAllByProduct(productId: string, pagination: any) {
    const { page = 1, limit = 10 } = pagination;
    const [data, total] = await this.reviewRepository.findAndCount({
      where: { product: { id: productId }, isApproved: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['user'],
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async approve(id: string) {
    const review = await this.reviewRepository.findOne({ where: { id }, relations: ['product'] });
    if (!review) throw new NotFoundException('Review not found');

    review.isApproved = true;
    await this.reviewRepository.save(review);

    // Recalculate product rating
    await this.updateProductRating(review.product.id);

    return { success: true };
  }

  private async updateProductRating(productId: string) {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.productId = :productId AND review.isApproved = true', { productId })
      .getRawOne();

    await this.productRepository.update(productId, {
      rating: parseFloat(result.avg || 0).toFixed(2) as any,
      reviewCount: parseInt(result.count || 0),
    });
  }
}
