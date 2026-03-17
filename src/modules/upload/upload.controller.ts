import {
  Controller,
  Post,
  Delete,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a single image' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadFile(file, 'general');
  }

  @Post('product-images')
  @UseInterceptors(FilesInterceptor('files', 6))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple product images (max 6)' })
  async uploadProductImages(@UploadedFiles() files: Express.Multer.File[]) {
    const results = await Promise.all(
      files.map((file) => this.uploadService.uploadFile(file, 'products')),
    );
    return results;
  }

  @Delete()
  @ApiOperation({ summary: 'Delete a file from storage' })
  async deleteFile(@Body('path') path: string) {
    return this.uploadService.deleteFile(path);
  }
}
