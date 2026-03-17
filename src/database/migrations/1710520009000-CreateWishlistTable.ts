import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWishlistTable1710520009000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE wishlists (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE wishlist_products (
        wishlist_id UUID REFERENCES wishlists(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        added_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (wishlist_id, product_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE wishlist_products;`);
    await queryRunner.query(`DROP TABLE wishlists;`);
  }
}
