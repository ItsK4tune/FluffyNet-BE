import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MinioClientService } from './minio-client.service';
import * as path from 'path';
import { tmpdir } from 'os';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegPath from 'ffmpeg-static';

@Injectable()
export class ConvertFileService {
  constructor(private readonly minioClient: MinioClientService) {
    ffmpeg.setFfmpegPath(ffmpegPath!);
  }

  async convertMp4ToHls(
    prefix: string,
    objectName: string,
    seekTimeThumbnail: number = 5,
  ): Promise<void> {
    const uniqueId = Date.now();
    const tmpInput = path.join(tmpdir(), `input-${uniqueId}.mp4`);
    const tmpOutputDirHls = path.join(tmpdir(), `hls-out-${uniqueId}`);
    const tmpOutputThumbnail = path.join(tmpdir(), `thumb-out-${uniqueId}.jpg`);

    if (!fs.existsSync(tmpOutputDirHls)) {
      fs.mkdirSync(tmpOutputDirHls, { recursive: true });
    }

    try {
      const stream = await this.minioClient.getObjectStream(objectName);
      const writeStream = fs.createWriteStream(tmpInput);
      await new Promise<void>((resolve, reject) => {
        stream
          .pipe(writeStream)
          .on('finish', () => {
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          });
      });

      if (!fs.existsSync(tmpInput) || fs.statSync(tmpInput).size === 0) {
        throw new InternalServerErrorException(
          'Downloaded video file is missing or empty.',
        );
      }

      const outputManifest = path.join(tmpOutputDirHls, 'index.m3u8');
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpInput)
          .addOptions([
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-c:v libx264',
            '-hls_time 10',
            '-hls_list_size 0',
            '-f hls',
            '-preset veryfast',
            '-hls_segment_filename',
            path.join(tmpOutputDirHls, 'segment%03d.ts'),
          ])
          .output(outputManifest)
          .on('end', () => {
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          })
          .run();
      });

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpInput)
          .inputOptions([`-ss ${seekTimeThumbnail}`])
          .outputOptions(['-vframes 1', '-f image2', '-q:v 2'])
          .output(tmpOutputThumbnail)
          .on('end', () => {
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          })
          .run();
      });

      const thumbnailObjectName = `${prefix}thumbnail.jpg`;
      await this.minioClient.putObject(thumbnailObjectName, tmpOutputThumbnail);

      const files = fs.readdirSync(tmpOutputDirHls);
      for (const file of files) {
        const filePath = path.join(tmpOutputDirHls, file);
        const targetObjectName = `${prefix}${file}`;

        if (!fs.existsSync(filePath)) {
          continue;
        }

        try {
          await this.minioClient.putObject(targetObjectName, filePath);
        } catch (uploadError: any) {
          throw new InternalServerErrorException(
            `Lỗi khi upload file HLS: ${file}`,
            uploadError.message,
          );
        }
      }
    } catch (error: any) {
      throw error instanceof Error
        ? error
        : new InternalServerErrorException(
            'Lỗi không xác định trong quá trình chuyển đổi video.',
          );
    } finally {
      try {
        if (fs.existsSync(tmpInput)) fs.unlinkSync(tmpInput);
        if (fs.existsSync(tmpOutputDirHls))
          fs.rmSync(tmpOutputDirHls, { recursive: true, force: true });
        if (fs.existsSync(tmpOutputThumbnail))
          fs.unlinkSync(tmpOutputThumbnail);
      } catch (cleanupErr: any) {
        throw cleanupErr;
      }
    }
  }
}
