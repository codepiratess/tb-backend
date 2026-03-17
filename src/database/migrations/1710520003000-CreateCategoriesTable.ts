import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCategoriesTable1710520003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        slug VARCHAR(120) NOT NULL UNIQUE,
        description TEXT,
        image TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_categories_slug ON categories(slug) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_categories_active ON categories(is_active) WHERE deleted_at IS NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE categories;`);
  }
}
