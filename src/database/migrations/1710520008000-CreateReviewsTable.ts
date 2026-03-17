import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviewsTable1710520008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(200),
        comment TEXT NOT NULL,
        images TEXT[] DEFAULT '{}',
        is_verified_purchase BOOLEAN DEFAULT false,
        is_approved BOOLEAN DEFAULT false,
        helpful_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        UNIQUE(user_id, product_id)
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_reviews_product ON reviews(product_id, is_approved) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_reviews_user ON reviews(user_id) WHERE deleted_at IS NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE reviews;`);
  }
}
