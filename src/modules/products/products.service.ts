import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike, IsNull } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductSpecification } from './entities/product-specification.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { Category } from '../categories/entities/category.entity';
import slugify from 'slugify';

/**
 * SQL FIXES FOR SUPABASE EDITOR:
 * 
 * -- Fix existing products
 * UPDATE products 
 * SET 
 *   category_id = (
 *     SELECT id FROM categories 
 *     WHERE slug = 'electronics' LIMIT 1
 *   ),
 *   is_active = true,
 *   is_featured = true
 * WHERE category_id IS NULL;
 */

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSpecification)
    private readonly specRepository: Repository<ProductSpecification>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  async resolveCategory(categoryIdOrSlug: string): Promise<string> {
    if (!categoryIdOrSlug) return null;
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(categoryIdOrSlug)) {
      return categoryIdOrSlug;
    }

    // It's a slug — find real UUID
    const category = await this.categoryRepository.findOne({
      where: { slug: categoryIdOrSlug }
    });
    
    if (!category) {
      throw new BadRequestException(`Category "${categoryIdOrSlug}" not found`);
    }
    
    return category.id;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const { specifications, categoryId, ...productData } = dto;
    
    const resolvedCategoryId = await this.resolveCategory(categoryId);
    
    let slug = dto.slug || slugify(dto.name, { lower: true });
    const existing = await this.productRepository.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const discount = dto.originalPrice > dto.price 
      ? ((dto.originalPrice - dto.price) / dto.originalPrice) * 100 
      : 0;

    const freeDelivery = dto.freeDelivery !== undefined 
      ? dto.freeDelivery 
      : dto.price > 499;

    const product = this.productRepository.create({
      ...productData,
      category: { id: resolvedCategoryId } as any,
      slug,
      discount,
      freeDelivery,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    if (specifications) {
      product.specifications = specifications.map((spec) =>
        this.specRepository.create(spec),
      );
    }

    return this.productRepository.save(product);
  }

  async findAll(filterDto: ProductFilterDto) {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      isFeatured,
      isNewArrival,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      includeInactive,
      stock,
    } = filterDto

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect(
        'product.category', 
        'category'
      )
      .leftJoinAndSelect(
        'product.specifications',
        'specifications'
      )
      .where('product.deletedAt IS NULL')

    // Only show active products 
    // unless admin requests all
    if (!includeInactive) {
      qb.andWhere(
        'product.isActive = :active',
        { active: true }
      )
    }

    // ── CATEGORY FILTER (KEY FIX) ──────
    // Handle both UUID and slug
    if (categoryId) {
      // Check if it looks like a UUID
      const uuidRegex = 
        /^[0-9a-f]{8}-[0-9a-f]{4}-/i
      
      if (uuidRegex.test(categoryId)) {
        // It's a real UUID
        qb.andWhere(
          'product.categoryId = :categoryId',
          { categoryId }
        )
      } else {
        // It's a slug — join and filter
        qb.andWhere(
          'category.slug = :slug',
          { slug: categoryId }
        )
      }
    }

    // Also support explicit categorySlug param
    if (categorySlug) {
      const slugs = categorySlug.split(',').filter(Boolean);
      if (slugs.length > 1) {
        qb.andWhere('category.slug IN (:...catSlugs)', { catSlugs: slugs });
      } else if (slugs.length === 1) {
        qb.andWhere('category.slug = :catSlug', { catSlug: slugs[0] });
      }
    }
    // ── END CATEGORY FILTER ────────────

    if (search) {
      qb.andWhere(
        '(product.name ILIKE :search ' +
        'OR product.description ILIKE :search ' +
        'OR product.tags::text ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    if (minPrice !== undefined) {
      qb.andWhere(
        'product.price >= :minPrice',
        { minPrice }
      )
    }

    if (maxPrice !== undefined) {
      qb.andWhere(
        'product.price <= :maxPrice',
        { maxPrice }
      )
    }

    if (minRating !== undefined) {
      qb.andWhere(
        'product.rating >= :minRating',
        { minRating }
      )
    }

    if (inStock) {
      qb.andWhere('product.stock > 0')
    }

    if (isFeatured) {
      qb.andWhere(
        'product.isFeatured = :featured',
        { featured: true }
      )
    }

    if (isNewArrival) {
      qb.andWhere(
        'product.isNewArrival = :newArrival',
        { newArrival: true }
      )
    }

    if (stock === 'low') {
      qb.andWhere('product.stock <= product.lowStockThreshold')
    }

    // Sorting
    const allowedSortFields = [
      'price', 'createdAt', 'rating', 
      'soldCount', 'name', 'stock'
    ]
    const safeSortBy = allowedSortFields
      .includes(sortBy) ? sortBy : 'createdAt'
    const safeSortOrder = 
      sortOrder === 'ASC' ? 'ASC' : 'DESC'

    qb.orderBy(
      `product.${safeSortBy}`, 
      safeSortOrder
    )

    const total = await qb.getCount()

    const products = await qb
      .skip((Number(page) - 1) * Number(limit))
      .take(Number(limit))
      .getMany()

    return {
      data: products,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(
        total / Number(limit)
      ),
    }
  }

  async findFeatured(limit = 10) {
    return this.productRepository.find({
      where: {
        isActive: true,
        isFeatured: true,
        deletedAt: IsNull(),
      },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: limit,
    })
  }

  async findNewArrivals(limit = 10) {
    // First try isNewArrival = true
    const newArrivals = await this.productRepository
      .find({
        where: {
          isActive: true,
          isNewArrival: true,
          deletedAt: IsNull(),
        },
        relations: ['category'],
        order: { createdAt: 'DESC' },
        take: limit,
      })

    // If none found, return latest active
    if (newArrivals.length === 0) {
      return this.productRepository.find({
        where: {
          isActive: true,
          deletedAt: IsNull(),
        },
        relations: ['category'],
        order: { createdAt: 'DESC' },
        take: limit,
      })
    }

    return newArrivals
  }

  async findOne(slugOrId: string): Promise<Product> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);
    
    const query = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.specifications', 'specifications');

    if (isUuid) {
      query.where('product.id = :id', { id: slugOrId });
    } else {
      query.where('product.slug = :slug', { slug: slugOrId });
    }

    const product = await query.getOne();
    if (!product) throw new NotFoundException('Product not found');

    // Atomic increment view count
    this.productRepository.increment({ id: product.id }, 'viewCount', 1).catch(() => {});

    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id }, relations: ['specifications'] });
    if (!product) throw new NotFoundException('Product not found');

    const { specifications, categoryId, ...updateData } = dto;

    if (categoryId) {
      const resolvedCategoryId = await this.resolveCategory(categoryId);
      product.category = { id: resolvedCategoryId } as any;
    }

    if (dto.price || dto.originalPrice || dto.freeDelivery !== undefined) {
      const price = dto.price || product.price;
      const originalPrice = dto.originalPrice || product.originalPrice;
      updateData['discount'] = originalPrice > price 
        ? ((originalPrice - price) / originalPrice) * 100 
        : 0;
      
      if (dto.freeDelivery !== undefined) {
        updateData['freeDelivery'] = dto.freeDelivery;
      } else if (dto.price) {
        updateData['freeDelivery'] = price > 499;
      }
    }

    if (specifications) {
      await this.specRepository.delete({ product: { id } });
      product.specifications = specifications.map(s => this.specRepository.create({ ...s, product }));
    }

    Object.assign(product, updateData);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const result = await this.productRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('Product not found');
  }

  async updateStock(id: string, quantity: number): Promise<void> {
    await this.productRepository.update(id, { stock: quantity });
  }

  async toggleStatus(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    product.isActive = !product.isActive;
    return this.productRepository.save(product);
  }

  async toggleFeatured(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    product.isFeatured = !product.isFeatured;
    return this.productRepository.save(product);
  }
}
