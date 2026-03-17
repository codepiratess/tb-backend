import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderItemsTable1710520007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        product_name VARCHAR(200) NOT NULL,
        product_image TEXT,
        product_slug VARCHAR(220),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_order_items_order ON order_items(order_id);`);
    await queryRunner.query(`CREATE INDEX idx_order_items_product ON order_items(product_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE order_items;`);
  }
}
