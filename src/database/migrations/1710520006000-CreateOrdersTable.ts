import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTable1710520006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number VARCHAR(20) NOT NULL UNIQUE,
        user_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','refunded')),
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
        payment_method VARCHAR(30) NOT NULL,
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        razorpay_signature TEXT,
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        delivery_charge DECIMAL(10,2) DEFAULT 0,
        total_amount DECIMAL(10,2) NOT NULL,
        shipping_address JSONB NOT NULL,
        notes TEXT,
        cancel_reason TEXT,
        estimated_delivery TIMESTAMP,
        delivered_at TIMESTAMP,
        shipped_at TIMESTAMP,
        status_history JSONB[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_orders_user ON orders(user_id) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_orders_number ON orders(order_number);`);
    await queryRunner.query(`CREATE INDEX idx_orders_created ON orders(created_at DESC) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_orders_payment_status ON orders(payment_status) WHERE deleted_at IS NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE orders;`);
  }
}
