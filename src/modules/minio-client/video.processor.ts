import {
  Process,
  Processor,
  OnQueueFailed,
  OnQueueCompleted,
} from '@nestjs/bull';
import { Job } from 'bullmq';
import { ConvertFileService } from './convert-file.service';
import { PostService } from '../post/post.service';
import { Status } from 'src/utils/enums/enum';
import { MinioClientService } from './minio-client.service';
import { CommentService } from '../comment/comment.service';
import { Logger } from '@nestjs/common';

interface VideoConversionJobData {
  prefix: string;
  id: number;
  objectName: string;
}

@Processor('video-conversion')
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);
  constructor(
    private readonly convertFileService: ConvertFileService,
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    private readonly minio: MinioClientService,
  ) {}

  @Process('post-convert-hls')
  async handlePostVideoConversion(
    job: Job<VideoConversionJobData>,
  ): Promise<void> {
    const { prefix, id, objectName } = job.data;
    this.logger.log(
      `Starting post video conversion job ${job.id} for post ${id}, object: ${objectName}`,
    );
    try {
      await this.convertFileService.convertMp4ToHls(prefix, objectName);

      await this.postService.setStatus(id, Status.done);
    } catch (error: any) {
      throw error;
    }
  }

  @Process('comment-convert-hls')
  async handleCommentVideoConversion(
    job: Job<VideoConversionJobData>,
  ): Promise<void> {
    const { prefix, id, objectName } = job.data;

    try {
      await this.convertFileService.convertMp4ToHls(prefix, objectName);
      await this.commentService.setStatus(id, Status.done);
      this.logger.log(
        `Finished post video conversion job ${job.id} successfully.`,
      );
    } catch (error: any) {
      this.logger.error(
        `Job ${job.id} (post ${id}) failed during post-convert-hls process: ${error?.message}`,
        error?.stack,
      );
      throw error;
    }
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<VideoConversionJobData>) {
    const { objectName } = job.data;
    this.logger.log(
      `Job ${job.id} completed. Deleting original object: ${objectName}`,
    );
    try {
      await this.minio.deleteFile(objectName);
      this.logger.log(`Successfully deleted original object: ${objectName}`);
    } catch (deleteError: any) {
      this.logger.error(
        `Failed to delete original object ${objectName} after job ${job.id} completed: ${deleteError.message}`,
        deleteError.stack,
      );
    }
  }

  @OnQueueFailed()
  async onError(job: Job<VideoConversionJobData>, error: Error) {
    const { prefix, id } = job.data;
    if (prefix.startsWith('posts/'))
      await this.postService.setStatus(id, Status.failed);
    else await this.commentService.setStatus(id, Status.failed);
    await this.minio.deleteFolder(prefix);
  }
}
