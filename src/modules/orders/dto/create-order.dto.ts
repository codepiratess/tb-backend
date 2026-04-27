import {
  IsArray, IsEnum, IsNotEmpty,
  IsOptional, IsString, IsUUID,
  IsInt, Min, ValidateNested,
  IsObject, IsNumber, MaxLength
} from 'class-validator'
import { Type, Transform } from 
  'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class OrderItemDto {
  @ApiProperty({ 
    example: 'uuid-here' 
  })
  @IsUUID()
  productId: string

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number
}

export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fullName: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  addressLine1: string

  @ApiProperty()
  @IsOptional()
  @IsString()
  addressLine2?: string

  @ApiProperty()
  @IsOptional()
  @IsString()
  landmark?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  city: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  pincode: string

  @ApiProperty()
  @IsOptional()
  @IsString()
  addressType?: string
}

export enum PaymentMethod {
  COD = 'cod',
  RAZORPAY = 'razorpay',
  UPI = 'upi',
  CARD = 'card',
  NETBANKING = 'netbanking',
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]

  @ApiProperty({ 
    type: ShippingAddressDto 
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string
}
