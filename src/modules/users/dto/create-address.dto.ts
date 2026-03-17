import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsEnum, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/)
  phone: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  pincode: string;

  @ApiProperty({ enum: ['home', 'work', 'other'] })
  @IsEnum(['home', 'work', 'other'])
  addressType: string;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
