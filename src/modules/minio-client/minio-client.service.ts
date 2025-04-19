import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { env } from 'src/config';
import { Client } from 'minio';
import * as path from 'path';
import { Readable } from 'stream';
import * as mime from 'mime-types';
import * as fs from 'fs';

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'application/pdf',
  'mp3/mpeg',
];

const checkValidMineType = (mimeType: string): void => {
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new BadRequestException(`Invalid file type: ${mimeType}. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }
};

@Injectable()
export class MinioClientService implements OnModuleInit {
  private readonly baseBucket = env.minio.bucket;
  private minioClient: Client;

  constructor() {
    try {
      const publicUrl = new URL(env.minio.url);

      this.minioClient = new Client({
        endPoint: publicUrl.hostname,
        port: publicUrl.port ? parseInt(publicUrl.port, 10) : undefined,
        useSSL: publicUrl.protocol === 'https:',
        accessKey: env.minio.accessKey,
        secretKey: env.minio.secretKey,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to initialize Minio Client configuration.');
    }
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  async getObjectStream(objectName: string): Promise<Readable> {
    try {
      return await this.minioClient.getObject(this.baseBucket, objectName);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to fetch object stream for: ${objectName}`);
    }
  }

  async putObject(
    objectName: string,
    streamOrPath: Readable | string,
    size?: number,
   ): Promise<void> {
    const contentType = mime.lookup(objectName) || 'application/octet-stream';
    let objectSize = size;
    let streamToUpload: Readable;

    if (typeof streamOrPath === 'string') {
      try {
        if (!fs.existsSync(streamOrPath)) {
          throw new Error(`File không tồn tại tại đường dẫn: ${streamOrPath}`);
        }
        const stats = fs.statSync(streamOrPath);
        if (objectSize === undefined) {
          objectSize = stats.size;
        }
        streamToUpload = fs.createReadStream(streamOrPath);

        streamToUpload.on('error', (streamReadError) => {
        });

      } catch (statError: any) {
          throw new InternalServerErrorException(`Không thể xử lý file nguồn: ${objectName}`, { cause: statError });
      }
    } else {
      streamToUpload = streamOrPath;
      if (objectSize === undefined) {
        objectSize = -1; 
      }
    }
    
    try {
      if (!this.minioClient || typeof this.minioClient.putObject !== 'function') {
        throw new Error('MinIO client không hợp lệ hoặc chưa được khởi tạo.');
      }

      await this.minioClient.putObject(this.baseBucket, objectName, streamToUpload, objectSize, {
        'Content-Type': contentType,
      });


    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to upload object to MinIO: ${objectName}. Reason: ${error.message}`,
        { cause: error } 
      );
    } finally {
      if (typeof streamOrPath === 'string' && streamToUpload && typeof streamToUpload.destroy === 'function') {
        streamToUpload.destroy();
      }
    }
  }

  async generatePresignedUploadUrl(
    originalFilename: string,
    contentType: string,
    prefix: string = '', 
    expiry: number = 5 * 60, 
  ): Promise<{ presignedUrl: string; objectName: string }> {
    checkValidMineType(contentType); 
    try {
      const fileExtension = path.extname(originalFilename);
      const uniqueObjectName = `${prefix}${uuidv4()}${fileExtension}`;

      const presignedUrl = await this.minioClient.presignedPutObject(
        this.baseBucket,
        uniqueObjectName,
        expiry,
      );

      return { presignedUrl, objectName: uniqueObjectName };
    } catch (error) {
      throw new InternalServerErrorException('Could not generate upload URL.');
    }
  }

  async generatePresignedDownloadUrl(
    objectName: string,
    expiry: number = 60 * 60 
  ): Promise<string | null> {
    if (!objectName) {
      return null; 
    }
    try {
      const url = await this.minioClient.presignedGetObject(
        this.baseBucket,
        objectName,
        expiry
      );
      
      return url;
    } catch (error) {
      return null;
    }
  }

  async deleteFile(objectName: string): Promise<void> {
    if (!objectName) {
      return;
    }

    const key = objectName; 

    try {
      await this.minioClient.removeObject(this.baseBucket, key);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete file: ${key}`);
    }
  }

  async deleteFolder(prefix: string): Promise<void> {
    const objectsList: string[] = [];
  
    const stream = this.minioClient.listObjects(this.baseBucket, prefix, true);
  
    for await (const obj of stream) {
      objectsList.push(obj.name);
    }
  
    if (objectsList.length === 0) return;
  
    try {
      await this.minioClient.removeObjects(this.baseBucket, objectsList);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to delete folder: ${prefix}`);
    }
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.baseBucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.baseBucket, env.minio.region || 'asia-southeast1');
      }
    } catch (error) {
      throw new InternalServerErrorException(`Failed to ensure MinIO bucket "${this.baseBucket}" exists.`);
    }
  }
}
