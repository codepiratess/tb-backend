import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtensions1710520000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent";`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Usually extensions are not dropped in down migration to avoid breaking other things
  }
}
