import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from './types/jwt-payload.type';
import { EmailService } from '../notifications/email/email.service';
import { SmsService } from '../notifications/sms/sms.service';
import { Wishlist } from '../wishlist/entities/wishlist.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, phone, password, firstName, lastName } = dto;

    // Check if user exists
    if (email) {
      const existingUser = await this.userRepository.findOne({ where: { email } });
      if (existingUser) throw new ConflictException('Email already registered');
    }
    if (phone) {
      const existingUser = await this.userRepository.findOne({ where: { phone } });
      if (existingUser) throw new ConflictException('Phone already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      firstName,
      lastName,
      email,
      phone,
      passwordHash,
      role: Role.CUSTOMER,
    });

    const savedUser = await this.userRepository.save(user);

    // Create wishlist
    const wishlist = this.wishlistRepository.create({ user: savedUser });
    await this.wishlistRepository.save(wishlist);

    // Generate tokens
    const tokens = await this.generateTokens({
      userId: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
    });

    await this.updateRefreshToken(savedUser.id, tokens.refreshToken);

    // Async notifications
    if (savedUser.email) {
      this.emailService.sendWelcomeEmail(savedUser).catch(() => {});
    }

    if (savedUser.phone) {
      await this.sendOTP(savedUser.phone);
    }

    return {
      user: savedUser.toJSON(),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const { email, phone, password, otp } = dto;

    // 1. Handle OTP Login
    if (otp && phone) {
      const user = await this.userRepository.findOne({
        where: { phone },
        select: [
          'id',
          'email',
          'phone',
          'otpHash',
          'otpExpiry',
          'role',
          'isActive',
          'firstName',
          'lastName',
        ],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.otpHash || !user.otpExpiry) {
        throw new BadRequestException('No active OTP found. Please request a new one.');
      }

      if (new Date() > user.otpExpiry) {
        throw new BadRequestException('OTP has expired. Please request a new one.');
      }

      const isOtpMatch = await bcrypt.compare(otp, user.otpHash);
      if (!isOtpMatch) {
        throw new UnauthorizedException('Invalid OTP code');
      }

      if (!user.isActive) {
        throw new ForbiddenException('Account is deactivated');
      }

      // Update user state
      await this.userRepository.update(user.id, {
        isPhoneVerified: true,
        otpHash: null,
        otpExpiry: null,
        lastLoginAt: new Date(),
      });

      const tokens = await this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        user: user.toJSON(),
        ...tokens,
      };
    }

    // 2. Handle Password Login
    const user = await this.userRepository.findOne({
      where: email ? { email } : { phone },
      select: [
        'id',
        'email',
        'phone',
        'passwordHash',
        'role',
        'isActive',
        'firstName',
        'lastName',
      ],
    });

    if (!user || (!user.passwordHash && !otp)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (password) {
      const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordMatch) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } else if (!otp) {
      throw new UnauthorizedException('Password or OTP required');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);
    
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'refreshTokenHash'],
    });

    if (!user || !user.refreshTokenHash) {
      throw new ForbiddenException('Access Denied');
    }

    const isTokenMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isTokenMatch) {
      throw new ForbiddenException('Access Denied');
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string) {
    await this.userRepository.update(userId, { refreshTokenHash: null });
  }

  async sendOTP(phone: string) {
    const user = await this.userRepository.findOne({ where: { phone } });
    if (!user) throw new BadRequestException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiry = new Date();
    expiry.setMinutes(
      expiry.getMinutes() +
        (this.configService.get<number>('OTP_EXPIRY_MINUTES') || 10),
    );

    // Save to DB
    await this.userRepository.update(user.id, {
      otpHash,
      otpExpiry: expiry,
    });

    // Send via Fast2SMS
    const smsSent = await this.smsService.sendOTP(phone, otp);

    if (!smsSent) {
      // SMS failed but don't throw error
      // OTP is still saved in DB
      // User can request resend
      this.logger.warn(
        `SMS failed for ${phone}, OTP saved to DB. User can still verify.`,
      );
    }

    // In development: always log OTP to console for easy testing
    if (this.configService.get('NODE_ENV') !== 'production') {
      this.logger.debug(`[DEV MODE] OTP for ${phone}: ${otp}`);
    }
  }

  async verifyOTP(phone: string, otp: string) {
    const user = await this.userRepository.findOne({
      where: { phone },
      select: ['id', 'otpHash', 'otpExpiry'],
    });

    if (!user || !user.otpHash || !user.otpExpiry) {
      throw new BadRequestException('Invalid OTP request');
    }

    if (new Date() > user.otpExpiry) {
      throw new BadRequestException('OTP expired');
    }

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) {
      throw new BadRequestException('Invalid OTP');
    }

    await this.userRepository.update(user.id, {
      isPhoneVerified: true,
      otpHash: null,
      otpExpiry: null,
    });

    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return { success: true }; // Don't reveal user existence

    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(token, 10);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    await this.userRepository.update(user.id, {
      passwordResetToken: hash,
      passwordResetExpiry: expiry,
    });

    const resetUrl = `${this.configService.get('FRONTEND_URL')}/auth/reset-password?token=${token}&email=${email}`;
    await this.emailService.sendPasswordResetEmail(user, resetUrl);

    return { success: true };
  }

  async resetPassword(dto: any) {
    const { token, email, password } = dto;
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'passwordResetToken', 'passwordResetExpiry'],
    });

    if (!user || !user.passwordResetToken || !user.passwordResetExpiry) {
      throw new BadRequestException('Invalid reset request');
    }

    if (new Date() > user.passwordResetExpiry) {
      throw new BadRequestException('Reset token expired');
    }

    const isMatch = await bcrypt.compare(token, user.passwordResetToken);
    if (!isMatch) {
      throw new BadRequestException('Invalid reset token');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await this.userRepository.update(user.id, {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
      refreshTokenHash: null, // Invalidate all sessions
    });

    return { success: true };
  }

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.accessSecret'),
        expiresIn: this.configService.get('jwt.accessExpires'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('jwt.refreshSecret'),
        expiresIn: this.configService.get('jwt.refreshExpires'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }
}
