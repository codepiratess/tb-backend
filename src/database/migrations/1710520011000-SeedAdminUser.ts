import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedAdminUser1710520011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Password: Admin@123 (bcrypt hash with 12 rounds)
    await queryRunner.query(`
      INSERT INTO users (
        id, first_name, last_name, email,
        password_hash, role, 
        is_email_verified, is_active
      ) VALUES (
        uuid_generate_v4(),
        'TownBolt',
        'Admin',
        'admin@townbolt.in',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TgxwM5f9f8z8z8z8z8z8z8z8z8z',
        'admin',
        true,
        true
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE email = 'admin@townbolt.in';`);
  }
}
