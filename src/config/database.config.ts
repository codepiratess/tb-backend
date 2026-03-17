import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    entities: [__dirname + '/../**/*.entity{.ts,.js}'],

    synchronize: process.env.NODE_ENV !== 'production',

    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,

    logging: process.env.NODE_ENV === 'development',
  }),
);
