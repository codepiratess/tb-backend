import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard-stats')
  @ApiOperation({ summary: 'Get high-level dashboard stats (Admin only)' })
  async getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue chart data (Admin only)' })
  async getRevenueChart(@Query('period') period: string) {
    return this.analyticsService.getRevenueChart(period);
  }
}
