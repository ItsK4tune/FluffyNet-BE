import { forwardRef, Module } from '@nestjs/common';
import { MinioClientService } from './minio-client.service';
import { ConvertFileService } from './convert-file.service';
import { BullModule } from '@nestjs/bull';
import { VideoProcessor } from './video.processor';
import { PostModule } from '../post/post.module';

@Module({
  imports: [
    forwardRef(() => PostModule),
    BullModule.registerQueue({
      name: 'video-conversion', 
    }),
  ],
  providers: [MinioClientService, ConvertFileService, VideoProcessor],
  exports: [MinioClientService, VideoProcessor],
})
export class MinioClientModule {}
