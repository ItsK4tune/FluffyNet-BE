import { Injectable } from '@nestjs/common';
import { Comment } from './entities/comment.entity';
import { CommentDto } from './dtos/comment.dto';
import { MinioEnum, RedisEnum } from 'src/utils/enums/enum';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';
import { CommentUtil } from './comment.util';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { MinioClientService } from '../minio-client/minio-client.service';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class CommentService {
    constructor(
        private readonly commentUtil: CommentUtil,
        private readonly redisCacheService: RedisCacheService,
        private readonly minioClientService: MinioClientService,
        private readonly notificationService: NotificationService,
        private readonly profileService: ProfileService,
    ) {}

    async findComment (comment_id: number): Promise<Comment> {
        return this.commentUtil.getCommentById(comment_id);
    }

    async getCommentsByPost(post_id: number): Promise<Comment[] | Record<string, any>> {
        const key = `${RedisEnum.comment}:${post_id}`;
        const cache = await this.redisCacheService.hgetall(key);

        let comments: any[];
        if (cache) {
            comments = Object.values(cache).map(comment => JSON.parse(comment));
        } else {
            comments = await this.commentUtil.getCommentByPost(post_id);
            await this.redisCacheService.hsetall(key, comments);
            await this.redisCacheService.expire(key, convertToSeconds(env.redis.ttl));
        }

        return this.buildCommentTree(comments);
    }

    async createComment(post_id: number, user_id: number, commentDto: CommentDto, files: { image?: any, video?: any }) {
        const key = `${RedisEnum.comment}:${post_id}`;

        const newComment = await this.commentUtil.createComment(post_id, user_id, commentDto, files);
        await this.redisCacheService.hset(key, newComment.comment_id.toString(), newComment);

        if (commentDto.parent_id) {
            const parentComment = await this.commentUtil.getCommentById(commentDto.parent_id);
            if (parentComment) {
                const profile = await this.profileService.getProfile(parentComment.user_id);

                if (profile) {
                    await this.notificationService.createNotification(
                        parentComment.user_id,
                        'comment',
                        {
                            profile: profile,
                            message: `User ${user_id} replied to your comment`,
                            post_id: post_id,
                        }
                    );
                }
            }
        }

        const profile = await this.profileService.getProfile(user_id);
        await this.notificationService.createNotification(
            user_id,
            'comment',
            {
                profile: profile,
                message: `User ${user_id} commented on your post`,
                post_id: post_id,
            }
        );
        
        return true;
    }

    async updateComment(post_id: number, user_id: number, comment_id: number, commentDto: CommentDto, files: { image?: any, video?: any }): Promise<Boolean> {
        const key = `${RedisEnum.comment}:${post_id}`;

        const comment = await this.commentUtil.getCommentById(comment_id);
        if (!comment)   return null; 
        if (comment.user_id !== user_id)    return false; 

        Object.assign(comment, commentDto);

        if (files?.image?.[0]) {
            comment.image = await this.minioClientService.upload(files.image[0], MinioEnum.image);
        }
    
        if (files?.video?.[0]) {
            comment.video = await this.minioClientService.upload(files.video[0], MinioEnum.video);
        }

        await this.commentUtil.saveComment(comment);
        await this.redisCacheService.hset(key, comment_id.toString(), comment);
        return true;
    }

    async deleteComment(post_id: number, user_id: number, comment_id: number): Promise<Boolean> {
        const key = `${RedisEnum.comment}:${post_id}`;
        await this.redisCacheService.del(key);

        const comment = await this.commentUtil.getCommentById(comment_id);
        if (!comment)   return null; 
        if (comment.user_id !== user_id)    return false; 

        await this.commentUtil.deleteComment(comment_id);
        await this.redisCacheService.hdel(key, comment_id.toString());
        return true;
    }

    private buildCommentTree(comments: Comment[], parentId: number | null = null): any[] {
        return comments
            .filter(comment => comment.parent_id === parentId) 
            .map(comment => ({
                ...comment,
                children: this.buildCommentTree(comments, comment.comment_id)
            }));
    }
}
