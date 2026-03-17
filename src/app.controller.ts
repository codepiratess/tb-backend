import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'API Health Check' })
  async healthCheck() {
    let dbStatus = 'disconnected';
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch (err) {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
      database: dbStatus,
    };
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'API Information' })
  getInfo() {
    return {
      name: 'TownBolt API',
      version: '1.0.0',
      docs: '/api/docs',
    };
  }
}
