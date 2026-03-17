import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  UseGuards,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user full profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update profile information' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.userId, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get all saved addresses' })
  async getAddresses(@CurrentUser() user: any) {
    return this.usersService.getAddresses(user.userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Add a new address' })
  async addAddress(@CurrentUser() user: any, @Body() dto: CreateAddressDto) {
    return this.usersService.addAddress(user.userId, dto);
  }

  @Put('addresses/:id/set-default')
  @ApiOperation({ summary: 'Set an address as default' })
  async setDefaultAddress(@CurrentUser() user: any, @Param('id') addressId: string) {
    return this.usersService.setDefaultAddress(user.userId, addressId);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete an address' })
  async deleteAddress(@CurrentUser() user: any, @Param('id') addressId: string) {
    return this.usersService.deleteAddress(user.userId, addressId);
  }

  // Admin Routes
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }
}
