import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name)
  private supabase: SupabaseClient

  // ← EXACT bucket name (case-sensitive)
  private readonly BUCKET = 'townbolt-media'

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL')
    
    // ← MUST use SERVICE ROLE KEY
    // NOT the anon key
    // Service role key bypasses RLS
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      this.logger.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env')
    }

    this.logger.log(`Supabase URL: ${supabaseUrl}`)
    this.logger.log(`Using bucket: ${this.BUCKET}`)

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
  ): Promise<{
    url: string
    path: string
    size: number
    mimeType: string
  }> {
    // Validate file
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif',
    ]

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} not allowed. Use: JPG, PNG, WebP`
      )
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size must be under 5MB')
    }

    // Generate unique filename
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    const filename = `${uuidv4()}${ext}`

    // Build storage path
    // Result: general/uuid.jpg
    const storagePath = `${folder}/${filename}`

    this.logger.log(`Uploading to bucket: ${this.BUCKET}`)
    this.logger.log(`Storage path: ${storagePath}`)

    // Upload to Supabase Storage
    const { data, error } = await this.supabase.storage
      .from(this.BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
        cacheControl: '3600',
      })

    if (error) {
      this.logger.error(`Supabase upload error:`, error)
      throw new BadRequestException(`Upload failed: ${error.message}`)
    }

    this.logger.log(`Upload successful: ${data.path}`)

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.BUCKET)
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    this.logger.log(`Public URL: ${publicUrl}`)

    return {
      url: publicUrl,
      path: storagePath,
      size: file.size,
      mimeType: file.mimetype,
    }
  }

  async uploadMultiple(
    files: Express.Multer.File[],
    folder: string = 'general',
  ) {
    const results = await Promise.all(
      files.map(file => this.uploadFile(file, folder))
    )
    return results
  }

  async deleteFile(filePath: string) {
    const { error } = await this.supabase.storage.from(this.BUCKET).remove([filePath])

    if (error) {
      this.logger.error(`Delete error:`, error)
      throw new BadRequestException(`Delete failed: ${error.message}`)
    }

    return { success: true, path: filePath }
  }

  // Test bucket connection
  async testBucketConnection(): Promise<{
    success: boolean
    message: string
    bucketExists?: boolean
    isPublic?: boolean
  }> {
    try {
      const { data: buckets, error } = await this.supabase.storage.listBuckets()

      if (error) {
        return {
          success: false,
          message: `Cannot list buckets: ${error.message}. Check SUPABASE_SERVICE_KEY.`,
        }
      }

      const bucket = buckets?.find(b => b.name === this.BUCKET)

      if (!bucket) {
        const bucketNames = buckets?.map(b => b.name).join(', ')
        return {
          success: false,
          bucketExists: false,
          message: `Bucket "${this.BUCKET}" not found. Available buckets: ${bucketNames || 'none'}`,
        }
      }

      return {
        success: true,
        bucketExists: true,
        isPublic: bucket.public,
        message: bucket.public
          ? `Bucket "${this.BUCKET}" found and is PUBLIC ✅`
          : `Bucket "${this.BUCKET}" found but is PRIVATE ⚠️ — URLs will return 404. Make it public in Supabase.`,
      }
    } catch (err) {
      return {
        success: false,
        message: `Error: ${err.message}`,
      }
    }
  }
}
