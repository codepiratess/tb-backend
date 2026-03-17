import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ example: 'john@example.com' })
  @ValidateIf((o) => !o.phone || o.email)
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '9876543210' })
  @ValidateIf((o) => !o.email || o.phone)
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid Indian mobile number' })
  phone?: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password too weak. Must contain uppercase, lowercase, number/special character.',
  })
  password: string;
}
