import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Comment } from './entities/comment.entity';
import { CommentDto } from './dtos/comment.dto';
import { RedisEnum } from 'src/utils/enums/enum';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';
import { CommentUtil } from './comment.util';
import { RedisCacheService } from '../redis-cache/redis-cache.service';

@Injectable()
export class CommentService {
    constructor(
        private readonly commentUtil: CommentUtil,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    async getCommentsByPost(post_id: number): Promise<Comment[] | Record<string, any>> {
        const key = `${RedisEnum.comment}:${post_id}`;
        const cache = await this.redisCacheService.hgetall(key);
        if (cache) return cache;

        const comments = await this.commentUtil.getCommentByPost(post_id);

        await this.redisCacheService.hsetall(key, comments);
        await this.redisCacheService.expire(key, convertToSeconds(env.redis.ttl));
        return comments;
    }

    async createComment(user_id: number, commentDto: CommentDto) {
        try {
            await this.commentUtil.createComment(user_id, commentDto);
            return true;
        }
        catch {
            return false;
        }
    }

    async updateComment(user_id: number, comment_id: number, commentDto: CommentDto): Promise<Boolean> {
        const comment = await this.commentUtil.getCommentById(comment_id);
        if (!comment)   return null; 
        if (comment.user_id !== user_id)    return false; 

        Object.assign(comment, commentDto);
        await this.commentUtil.saveComment(comment);
        return true;
    }

    async deleteComment(user_id: number, comment_id: number): Promise<Boolean> {
        const comment = await this.commentUtil.getCommentById(comment_id);
        if (!comment)   return null; 
        if (comment.user_id !== user_id)    return false; 

        await this.commentUtil.deleteComment(comment_id);
        return true;
    }
}
