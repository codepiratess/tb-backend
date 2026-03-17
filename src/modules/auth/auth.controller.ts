import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RefreshTokenGuard } from '../../common/guards/refresh-token.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.register(dto);
    this.setCookies(res, data.refreshToken);
    return { user: data.user, accessToken: data.accessToken };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/phone and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const data = await this.authService.login(dto);
    this.setCookies(res, data.refreshToken);
    return { user: data.user, accessToken: data.accessToken };
  }

  @Public()
  @Post('send-otp')
  @ApiOperation({
    summary: 'Send OTP to phone number',
    description:
      'Sends a 6-digit OTP via Fast2SMS. In development mode, OTP is also logged to server console.',
  })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  @ApiResponse({ status: 429, description: 'Too many OTP requests' })
  async sendOTP(@Body('phone') phone: string) {
    return this.authService.sendOTP(phone);
  }

  @Get('dev/otp/:phone')
  @Public()
  async getDevOTP(@Param('phone') phone: string) {
    // ONLY available in development
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Not available in production');
    }

    // Find user and return their current OTP hash info
    // (for testing without real SMS)
    const user = await this.usersService.findByPhone(phone);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'Check server console for OTP (dev mode only)',
      phone: phone,
      otpExpiry: user.otpExpiry,
      hint: 'OTP is logged in NestJS console with [DEV MODE] prefix',
    };
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refreshTokens(user.userId, user.refreshToken);
    this.setCookies(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user and clear session' })
  async logout(@CurrentUser() user: any, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.userId);
    res.clearCookie('refresh_token');
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset token' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: any) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser() user: any) {
    return user;
  }

  private setCookies(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
