import { IsString, IsNotEmpty, IsOptional, IsEmail, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Password@123' })
  @IsOptional()
  @ValidateIf(o => !o.otp)
  @IsString()
  @IsNotEmpty({ message: 'Password is required when OTP is not provided' })
  password?: string;

  @ApiProperty({ example: '123456' })
  @IsOptional()
  @IsString()
  otp?: string;

  @ValidateIf(o => !o.email && !o.phone)
  @IsNotEmpty({ message: 'Either email or phone must be provided' })
  credentialCheck?: string;
}
