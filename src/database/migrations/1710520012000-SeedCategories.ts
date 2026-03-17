import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCategories1710520012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const categories = [
      ['Mobiles', 'mobiles'],
      ['Electronics', 'electronics'],
      ['Clothing', 'clothing'],
      ['Footwear', 'footwear'],
      ['Home & Kitchen', 'home-kitchen'],
      ['Beauty', 'beauty'],
      ['Sports', 'sports'],
      ['Books', 'books'],
      ['Toys', 'toys'],
      ['Grocery', 'grocery'],
      ['Furniture', 'furniture'],
      ['Appliances', 'appliances'],
    ];

    for (const [name, slug] of categories) {
      await queryRunner.query(`
        INSERT INTO categories (id, name, slug, is_active)
        VALUES (uuid_generate_v4(), '${name}', '${slug}', true);
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM categories;`);
  }
}
