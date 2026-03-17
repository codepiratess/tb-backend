import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1710520001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50),
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(15) UNIQUE,
        password_hash VARCHAR(255),
        role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer','admin')),
        is_email_verified BOOLEAN DEFAULT false,
        is_phone_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        profile_image TEXT,
        refresh_token_hash TEXT,
        otp_hash TEXT,
        otp_expiry TIMESTAMP,
        password_reset_token TEXT,
        password_reset_expiry TIMESTAMP,
        last_login_at TIMESTAMP,
        fcm_token TEXT,
        device_tokens TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;`);
    await queryRunner.query(`CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users;`);
  }
}
