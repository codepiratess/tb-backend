import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductsTable1710520004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(200) NOT NULL,
        slug VARCHAR(220) NOT NULL UNIQUE,
        description TEXT NOT NULL,
        short_description VARCHAR(500),
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2) NOT NULL,
        discount DECIMAL(5,2) DEFAULT 0,
        sku VARCHAR(100) UNIQUE,
        stock INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        images TEXT[] DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        is_new_arrival BOOLEAN DEFAULT false,
        free_delivery BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        sold_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        weight DECIMAL(8,2),
        dimensions JSONB,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_products_slug ON products(slug) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_products_active_featured ON products(is_active, is_featured) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_products_category ON products(category_id, is_active) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_products_price ON products(price) WHERE deleted_at IS NULL AND is_active = true;`);
    await queryRunner.query(`CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description,'')));`);
    await queryRunner.query(`CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE products;`);
  }
}
