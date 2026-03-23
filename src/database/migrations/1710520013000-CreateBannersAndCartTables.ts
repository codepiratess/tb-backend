import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBannersAndCartTables1710520013000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create banners table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(200) NOT NULL,
        subtitle VARCHAR(500),
        button_text VARCHAR(100) DEFAULT 'Shop Now',
        button_link VARCHAR(500),
        image TEXT,
        bg_color VARCHAR(200) DEFAULT 'from-[#2874F0] to-[#1a5dc8]',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `);

    // Create carts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create cart_items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(cart_id, product_id)
      );
    `);

    // Seed default banners
    await queryRunner.query(`
      INSERT INTO banners (title, subtitle, button_text, button_link, bg_color, sort_order)
      VALUES
        ('Electronics Sale', 'Shop Mobiles, Laptops & More', 'Shop Now', '/category/electronics', 'from-[#2874F0] to-[#1a5dc8]', 1),
        ('Fashion Week', 'Trendy Clothing & Footwear', 'Explore Now', '/category/clothing', 'from-[#FF6B35] to-[#FF4500]', 2),
        ('Home Essentials', 'Starting ₹199', 'Browse Now', '/category/home-kitchen', 'from-[#7C3AED] to-[#5B21B6]', 3)
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS cart_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS carts;`);
    await queryRunner.query(`DROP TABLE IF EXISTS banners;`);
  }
}
