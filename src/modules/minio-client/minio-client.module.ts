import { forwardRef, Module } from '@nestjs/common';
import { MinioClientService } from './minio-client.service';
import { ConvertFileService } from './convert-file.service';
import { PostModule } from '../post/post.module';

@Module({
  imports: [
    forwardRef(() => PostModule),
  ],
  providers: [MinioClientService, ConvertFileService],
  exports: [MinioClientService, ConvertFileService],
})
export class MinioClientModule {}
