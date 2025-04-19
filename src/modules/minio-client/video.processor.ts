import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { Job } from 'bullmq';
import { ConvertFileService } from './convert-file.service';
import { PostService } from '../post/post.service';
import { Status } from 'src/utils/enums/enum';
import { MinioClientService } from './minio-client.service';

interface VideoConversionJobData {
    category: string;
    post_id: number;
    user_id: number;
    objectName: string; 
}

@Processor('video-conversion')
export class VideoProcessor {
    constructor(
        private readonly convertFileService: ConvertFileService,
        private readonly postService: PostService,
        private readonly minio: MinioClientService,
    ) {}

    @Process('convert-hls')
    async handleVideoConversion(job: Job<VideoConversionJobData>): Promise<void> {
        const { category, post_id, user_id, objectName } = job.data;
        const jobId = job.id; 

        try {
            await this.convertFileService.convertMp4ToHls(
                category,
                user_id,
                post_id,
                objectName,
            );

        await this.postService.setStatus(post_id, Status.done);

        } catch (error: any) {
            throw error;
        }
    }

    @OnQueueCompleted()
    async onCompleted(job: Job<VideoConversionJobData>) {
        const { objectName } = job.data;
        await this.minio.deleteFile(objectName)
    }

    @OnQueueFailed()
    async onError(job: Job<VideoConversionJobData>, error: Error) {
        const { category, post_id, user_id } = job.data;
        await this.postService.setStatus(post_id, Status.failed);
        const targetObjectName = `posts/user_${user_id}/hlses/post_${post_id}`;
        await this.minio.deleteFolder(targetObjectName);
    }
}