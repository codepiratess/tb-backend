import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({ example: 'Electronics Sale' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Up to 70% Off' })
  @IsString()
  @IsOptional()
  subtitle?: string;

  @ApiPropertyOptional({ example: 'Shop Mobiles, Laptops & More' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Shop Now' })
  @IsString()
  @IsOptional()
  buttonText?: string;

  @ApiPropertyOptional({ example: '/category/electronics' })
  @IsString()
  @IsOptional()
  buttonLink?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ example: 'from-[#2874F0] to-[#1a5dc8]' })
  @IsString()
  @IsOptional()
  bgColor?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
