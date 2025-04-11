import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { v4 as uuidv4 } from 'uuid';
import { env } from 'src/config';
import { Client } from 'minio';
import path from 'path';
import { extname } from 'path';

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

  constructor(private readonly minio: MinioService) {
    this.minioClient = this.minio.client as unknown as Client;
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  async generatePresignedUploadUrl(
    originalFilename: string,
    contentType: string,
    prefix: string = '', 
    expiry: number = 5 * 60, 
  ): Promise<{ presignedUrl: string; objectName: string }> {
    checkValidMineType(contentType); 
    try {
      const fileExtension = extname(originalFilename);
      const uniqueObjectName = `${prefix}${uuidv4()}${fileExtension}`;

      const presignedUrl = await this.minioClient.presignedPutObject(
        this.baseBucket,
        uniqueObjectName,
        expiry,
      );

      return { presignedUrl, objectName: uniqueObjectName };
      } catch (error) {
        console.error("❌ generatePresignedUploadUrl error:", error);
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
      try {
        await this.minioClient.statObject(this.baseBucket, objectName);
      } catch (statError) {
        if ((statError as any)?.code === 'NotFound' || (statError as any)?.code === 'NoSuchKey') {
        return null; 
      }
      throw statError; 
    }

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
