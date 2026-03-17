import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow('SUPABASE_URL'),
      this.configService.getOrThrow('SUPABASE_SERVICE_KEY'),
    );
  }

  async uploadFile(file: Express.Multer.File, folder: string) {
    if (!file) throw new BadRequestException('No file provided');

    const fileExt = file.originalname.split('.').pop();
    const fileName = `${folder}/${uuidv4()}-${Date.now()}.${fileExt}`;

    const { data, error } = await this.supabase.storage
      .from(this.configService.getOrThrow('SUPABASE_STORAGE_BUCKET'))
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw new BadRequestException(error.message);

    const { data: urlData } = this.supabase.storage
      .from(this.configService.getOrThrow('SUPABASE_STORAGE_BUCKET'))
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      path: fileName,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async deleteFile(path: string) {
    const { error } = await this.supabase.storage
      .from(this.configService.getOrThrow('SUPABASE_STORAGE_BUCKET'))
      .remove([path]);

    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
