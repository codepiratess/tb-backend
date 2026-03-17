import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  path: string;

  @ApiProperty()
  mimetype: string;

  @ApiProperty()
  size: number;
}
