import {
  Injectable,
  HttpException,
  HttpStatus,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { BufferedFile } from './file.model';
import * as crypto from 'crypto';
import { env } from 'src/config';

const allowedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4'];

const checkValidMineType = (mimeType: string) => {
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new BadRequestException('Invalid file');
  }
};

@Injectable()
export class MinioClientService implements OnModuleInit {
  private readonly baseBucket = env.minio.bucket;

  constructor(private readonly minio: MinioService) {}

  async onModuleInit() {
    await this.createBucket(this.baseBucket);
  }

  public async upload(file: BufferedFile, folder: string) {
    checkValidMineType(file.mimetype);

    const ext = file.originalname.split('.').pop();
    const hashedFileName = crypto
      .createHash('md5')
      .update(Date.now().toString())
      .digest('hex');
    const filename = `${folder}/${hashedFileName}.${ext}`;
    const metaData = { 'Content-Type': file.mimetype };

    try {
      await this.minio.client.putObject(
        this.baseBucket,
        filename,
        file.buffer,
        file.size,
        metaData,
      );
      return hashedFileName;
    } catch (error) {
      throw new BadRequestException('Upload failed');
    }
  }

  public getFileUrl(filename: string): string {
    return `http://${env.minio.host}:${env.minio.port}/${this.baseBucket}/${filename}`;
  }

  async delete(filename: string) {
    try {
      await this.minio.client.removeObject(this.baseBucket, filename);
    } catch (error) {
      throw new BadRequestException('Delete failed');
    }
  }

  private async createBucket(bucketName: string) {
    const isExist = await this.minio.client.bucketExists(bucketName);
    if (!isExist) await this.minio.client.makeBucket(bucketName);
  }
}
