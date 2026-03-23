import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { UploadService } from './upload.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { UseGuards } from '@nestjs/common'
import { Public } from '../../common/decorators/public.decorator'
import { memoryStorage } from 'multer'

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name)

  constructor(private readonly uploadService: UploadService) {}

  // ← PUBLIC test endpoint to verify 
  // bucket connection without auth
  @Get('test')
  @Public()
  @ApiOperation({ summary: 'Test Supabase bucket connection' })
  async testConnection() {
    const result = await this.uploadService.testBucketConnection()
    return {
      success: result.success,
      data: result,
    }
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload single image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB
      },
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file provided. Send file as multipart/form-data with key "file"'
      )
    }

    this.logger.log(`Received file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`)

    const result = await this.uploadService.uploadFile(file, 'general')

    return {
      success: true,
      data: result,
    }
  }

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload multiple images (max 6)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 6, {
      storage: memoryStorage(),
      limits: { 
        fileSize: 5 * 1024 * 1024 
      },
    })
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided')
    }

    const results = await this.uploadService.uploadMultiple(files, 'general')

    return {
      success: true,
      data: results,
    }
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete uploaded file' })
  async deleteFile(@Body('path') filePath: string) {
    if (!filePath) {
      throw new BadRequestException('File path is required')
    }
    const result = await this.uploadService.deleteFile(filePath)
    return {
      success: true,
      data: result,
    }
  }
}
