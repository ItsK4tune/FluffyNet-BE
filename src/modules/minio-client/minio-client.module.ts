import { forwardRef, Module } from '@nestjs/common';
import { MinioClientService } from './minio-client.service';
import { ConvertFileService } from './convert-file.service';
import { PostModule } from '../post/post.module';
import { CommentModule } from '../comment/comment.module';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bull';
import { VideoProcessor } from './video.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'video-conversion',
    }),
    forwardRef(() => PostModule),
    forwardRef(() => CommentModule),
  ],
  providers: [
    MinioClientService,
    ConvertFileService,
    QueueService,
    VideoProcessor,
  ],
  exports: [MinioClientService, ConvertFileService, QueueService],
})
export class MinioClientModule {}
