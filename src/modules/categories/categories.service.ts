import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import slugify from 'slugify';
import { Product } from '../products/entities/product.entity';

/**
 * SQL TO RUN IN SUPABASE RIGHT NOW:
 * 
 * -- Remove the test category
 * DELETE FROM categories 
 * WHERE slug = 'test' 
 *    OR name ILIKE 'test';
 * 
 * -- Also reassign any products 
 * -- that were in test category
 * UPDATE products 
 * SET category_id = (
 *   SELECT id FROM categories 
 *   WHERE slug = 'electronics' 
 *   LIMIT 1
 * )
 * WHERE category_id = (
 *   SELECT id FROM categories 
 *   WHERE slug = 'test' 
 *   LIMIT 1
 * );
 */

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug || slugify(dto.name, { lower: true });
    
    const existing = await this.categoryRepository.findOne({ where: { slug } });
    if (existing) throw new ConflictException('Category already exists');

    const category = this.categoryRepository.create({
      ...dto,
      slug,
    });
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    const categories = await this.categoryRepository.createQueryBuilder('category')
      .leftJoin('category.products', 'product', 'product.isActive = :isActive', { isActive: true })
      .select([
        'category.id',
        'category.name',
        'category.slug',
        'category.description',
        'category.image',
        'category.isActive',
        'category.sortOrder',
        'category.createdAt'
      ])
      .addSelect('COUNT(product.id)', 'category_productCount')
      .where('category.isActive = :active', { active: true })
      .groupBy('category.id')
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getRawAndEntities();

    // Map the raw counts back to entities
    return categories.entities.map((entity, index) => {
      entity.productCount = parseInt(categories.raw[index].category_productCount, 10);
      return entity;
    });
  }

  async findOne(slugOrId: string): Promise<Category & { productCount: number }> {
    const uuidRegex = 
      /^[0-9a-f]{8}-[0-9a-f]{4}-/i
    
    let category: Category | null = null;

    if (uuidRegex.test(slugOrId)) {
      // It's a UUID
      category = await this.categoryRepository.findOne({ where: { id: slugOrId } });
    } else {
      // It's a slug
      category = await this.categoryRepository.findOne({ where: { slug: slugOrId } });
    }

    if (!category) {
      throw new NotFoundException(`Category "${slugOrId}" not found`);
    }

    // Add product count
    const productCount = await this.productRepository.count({
      where: { 
        category: { id: category.id },
        isActive: true,
        deletedAt: IsNull(),
      }
    });

    return { ...category, productCount };
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (dto.name && !dto.slug) {
      category.slug = slugify(dto.name, { lower: true });
    }
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    // Soft delete
    const result = await this.categoryRepository.update(id, { isActive: false, deletedAt: new Date() } as any);
    if (result.affected === 0) throw new NotFoundException('Category not found');
  }
}
