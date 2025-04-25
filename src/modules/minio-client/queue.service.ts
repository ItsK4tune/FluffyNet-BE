import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('video-conversion') private readonly videoQueue: Queue,
  ) {}

  async addPostVideoConversionJob(
    prefix: string,
    id: number,
    objectName: string,
  ): Promise<void> {
    await this.videoQueue.add(
      'post-convert-hls',
      {
        prefix,
        id,
        objectName,
      },
      { jobId: `Post ${Date.now()}` },
    );
  }

  async addCommentVideoConversionJob(
    prefix: string,
    id: number,
    objectName: string,
  ): Promise<void> {
    await this.videoQueue.add(
      'comment-convert-hls',
      {
        prefix,
        id,
        objectName,
      },
      { jobId: `Comment ${Date.now()}` },
    );
  }
}
