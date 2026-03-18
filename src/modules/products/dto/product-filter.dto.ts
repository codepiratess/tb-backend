import { IsOptional, IsString, IsNumber, IsBoolean, IsUUID, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ProductFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  // Accepts BOTH UUID and slug
  categoryId?: string

  @IsOptional()
  @IsString()
  categorySlug?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number

  @IsOptional()
  @Transform(({ value }) => 
    value === 'true' || value === true
  )
  @IsBoolean()
  inStock?: boolean

  @IsOptional()
  @Transform(({ value }) => 
    value === 'true' || value === true
  )
  @IsBoolean()
  isFeatured?: boolean

  @IsOptional()
  @Transform(({ value }) => 
    value === 'true' || value === true
  )
  @IsBoolean()
  isNewArrival?: boolean

  @IsOptional()
  @Transform(({ value }) => 
    value === 'true' || value === true
  )
  @IsBoolean()
  includeInactive?: boolean

  @IsOptional()
  @IsString()
  stock?: string
}
