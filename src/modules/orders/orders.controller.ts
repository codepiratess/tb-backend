import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OrderStatus } from '../../common/enums/order-status.enum';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user orders' })
  async findAll(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    return this.ordersService.findUserOrders(user.userId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single order detail' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOne(id, user.userId);
  }

  // Admin Routes
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('note') note: string,
    @CurrentUser() admin: any,
  ) {
    return this.ordersService.updateStatus(id, status, note, admin.userId);
  }
}
