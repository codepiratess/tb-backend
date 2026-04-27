import { IsUUID } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreatePaymentOrderDto {
  @ApiProperty({ 
    description: 'TownBolt order ID (UUID)',
    example: 'uuid-here'
  })
  @IsUUID()
  orderId: string
}
