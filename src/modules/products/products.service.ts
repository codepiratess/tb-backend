import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductSpecification } from './entities/product-specification.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSpecification)
    private readonly specRepository: Repository<ProductSpecification>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const { specifications, ...productData } = dto;
    
    let slug = slugify(dto.name, { lower: true });
    const existing = await this.productRepository.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const discount = dto.originalPrice > dto.price 
      ? ((dto.originalPrice - dto.price) / dto.originalPrice) * 100 
      : 0;

    const freeDelivery = dto.price > 499;

    const product = this.productRepository.create({
      ...productData,
      slug,
      discount,
      freeDelivery,
    });

    if (specifications) {
      product.specifications = specifications.map((spec) =>
        this.specRepository.create(spec),
      );
    }

    return this.productRepository.save(product);
  }

  async findAll(filter: ProductFilterDto) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search,
      categoryId,
      categorySlug,
      minPrice,
      maxPrice,
      isFeatured,
      isNewArrival,
      inStock,
    } = filter;

    const query = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy(`product.${sortBy}`, sortOrder as any);

    if (search) {
      query.andWhere('(product.name ILIKE :search OR product.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (categoryId) query.andWhere('category.id = :categoryId', { categoryId });
    if (categorySlug) query.andWhere('category.slug = :categorySlug', { categorySlug });
    if (minPrice) query.andWhere('product.price >= :minPrice', { minPrice });
    if (maxPrice) query.andWhere('product.price <= :maxPrice', { maxPrice });
    if (isFeatured !== undefined) query.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    if (isNewArrival !== undefined) query.andWhere('product.isNewArrival = :isNewArrival', { isNewArrival });
    if (inStock) query.andWhere('product.stock > 0');

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    const { specifications, ...updateData } = dto;

    if (dto.price || dto.originalPrice) {
      const price = dto.price || product.price;
      const originalPrice = dto.originalPrice || product.originalPrice;
      updateData['discount'] = originalPrice > price 
        ? ((originalPrice - price) / originalPrice) * 100 
        : 0;
      updateData['freeDelivery'] = price > 499;
    }

    if (specifications) {
      // Direct deletion of old specs and insertion of new ones for simplicity
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
}
