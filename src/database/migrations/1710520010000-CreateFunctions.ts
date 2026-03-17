import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFunctions1710520010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. updated_at function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Applying updated_at triggers
    const tables = ['users', 'addresses', 'categories', 'products', 'orders', 'reviews', 'wishlists'];
    for (const table of tables) {
      await queryRunner.query(`
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      `);
    }

    // 2. recalculate_product_rating function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION recalculate_product_rating(
        p_product_id UUID
      ) RETURNS VOID AS $$
      BEGIN
        UPDATE products
        SET 
          rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE product_id = p_product_id
              AND is_approved = true
              AND deleted_at IS NULL
          ),
          review_count = (
            SELECT COUNT(*)
            FROM reviews
            WHERE product_id = p_product_id
              AND is_approved = true
              AND deleted_at IS NULL
          )
        WHERE id = p_product_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. trigger_recalculate_rating function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trigger_recalculate_rating()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM recalculate_product_rating(
          COALESCE(NEW.product_id, OLD.product_id)
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Applying recalculate rating trigger
    await queryRunner.query(`
      CREATE TRIGGER recalculate_on_review_change
      AFTER INSERT OR UPDATE OR DELETE ON reviews
      FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_rating();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS recalculate_on_review_change ON reviews;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trigger_recalculate_rating();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS recalculate_product_rating(UUID);`);
    
    const tables = ['users', 'addresses', 'categories', 'products', 'orders', 'reviews', 'wishlists'];
    for (const table of tables) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};`);
    }
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at();`);
  }
}
