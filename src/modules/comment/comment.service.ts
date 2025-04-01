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
import { PostUtil } from '../post/post.util';
import { Profile } from '../profile/entities/profile.entity';

@Injectable()
export class CommentService {
  constructor(
    private readonly commentUtil: CommentUtil,
    private readonly redisCacheService: RedisCacheService,
    private readonly minioClientService: MinioClientService,
    private readonly notificationService: NotificationService,
    private readonly profileService: ProfileService,
    private readonly postUtil: PostUtil,
  ) {}

  async findComment (comment_id: number): Promise<Comment> {
      return this.commentUtil.getCommentById(comment_id);
  }

  async getCommentsByPost(post_id: number): Promise<Comment[] | Record<string, any>> {
      const key = `${RedisEnum.comment}:${post_id}`;
      const cache = await this.redisCacheService.hgetall(key);

  let comments: any[];
    if (cache) {
      comments = Object.values(cache).map((comment) => JSON.parse(comment));
    } else {
      comments = await this.commentUtil.getCommentByPost(post_id);
      await this.redisCacheService.hsetall(key, comments);
      await this.redisCacheService.expire(key, convertToSeconds(env.redis.ttl));
    }

    return this.buildCommentTree(comments);
  }

  async createComment(
    post_id: number,
    user_id: number,
    commentDto: CommentDto,
    files: { image?: any; video?: any },
  ) {
    const key = `${RedisEnum.comment}:${post_id}`;

    const newComment = await this.commentUtil.createComment(post_id, user_id, commentDto, files);
    await this.redisCacheService.hset(key, newComment.comment_id.toString(), newComment);

    const commenterProfile = await this.profileService.getProfile(user_id) as Profile;
    if (!commenterProfile) {
      console.error(`Profile not found for commenter user_id: ${user_id}`);
      return true;
    }

    const post = await this.postUtil.getPostById(post_id);
    if (!post) {
      console.error(`Post not found for post_id: ${post_id}`);
      return true;
    }
    const postOwnerId = post.user_id;

    const notificationPromises = [];

    if (postOwnerId !== user_id) {
      const notificationType = 'NEW_COMMENT';
      const notificationBody = {
        commenter: {
          user_id: commenterProfile.user_id,
          displayName: commenterProfile.name,
          avatarUrl: commenterProfile.avatar,
        },
        post: { id: post_id },
        comment: {
          id: newComment.comment_id,
        },
        message: `${commenterProfile.name || `User ${user_id}`} commented on your post.`,
        createdAt: new Date().toISOString(),
      };
      notificationPromises.push(
          this.notificationService.createNotification(postOwnerId, notificationType, notificationBody)
      );
    }

    if (commentDto.parent_id) {
      const parentComment = await this.commentUtil.getCommentById(commentDto.parent_id);
    
      if (parentComment && parentComment.user_id !== user_id) {
        const parentCommentOwnerId = parentComment.user_id;
        if (parentCommentOwnerId !== postOwnerId) {
          const notificationType = 'REPLY_COMMENT';
          const notificationBody = {
            replier: {
              user_id: commenterProfile.user_id,
              displayName: commenterProfile.name,
              avatarUrl: commenterProfile.avatar,
            },
            post: { id: post_id },
            parentComment: { id: parentComment.comment_id },
            replyComment: {
              id: newComment.comment_id,
            },
            message: `${commenterProfile.name || `User ${user_id}`} replied to your comment.`,
            createdAt: new Date().toISOString(),
          };
          notificationPromises.push(
            this.notificationService.createNotification(parentCommentOwnerId, notificationType, notificationBody)
          );
        }
      }
    }
    if (notificationPromises.length > 0) {
      await Promise.allSettled(notificationPromises);
    }
    return true;
  }

  async updateComment(
    post_id: number,
    user_id: number,
    comment_id: number,
    commentDto: CommentDto,
    files: { image?: any; video?: any },
  ): Promise<boolean> {
    const key = `${RedisEnum.comment}:${post_id}`;

    const comment = await this.commentUtil.getCommentById(comment_id);
    if (!comment) return null;
    if (comment.user_id !== user_id) return false;

    Object.assign(comment, commentDto);

    const oldImageUrl = comment.image;
    const oldVideoUrl = comment.video;

    let newImageUrl: string | null = comment.image;
    let newVideoUrl: string | null = comment.video;

    if (files?.image?.[0]) {
      newImageUrl = await this.minioClientService.upload(
        files.image[0],
        MinioEnum.image,
      );
      if (oldImageUrl && newImageUrl)
        this.minioClientService.delete(oldImageUrl);
      comment.image = newImageUrl;
    }

    if (files?.video?.[0]) {
      newVideoUrl = await this.minioClientService.upload(
        files.video[0],
        MinioEnum.video,
      );
      if (oldVideoUrl && newVideoUrl)
        this.minioClientService.delete(oldVideoUrl);
      comment.image = newVideoUrl;
    }

    await this.commentUtil.saveComment(comment);
    await this.redisCacheService.hset(key, comment_id.toString(), comment);
    return true;
  }

  async deleteComment(
    post_id: number,
    user_id: number,
    comment_id: number,
  ): Promise<boolean> {
    const key = `${RedisEnum.comment}:${post_id}`;
    await this.redisCacheService.del(key);

    const comment = await this.commentUtil.getCommentById(comment_id);
    if (!comment) return null;
    if (comment.user_id !== user_id) return false;

    if (comment.image)
      this.minioClientService.delete(comment.image);
    if (comment.video)
      this.minioClientService.delete(comment.video);
    await this.commentUtil.deleteComment(comment_id);
    await this.redisCacheService.hdel(key, comment_id.toString());
    return true;
  }

  private buildCommentTree(
    comments: Comment[],
    parentId: number | null = null,
  ): any[] {
    return comments
      .filter((comment) => comment.parent_id === parentId)
      .map((comment) => ({
        ...comment,
        children: this.buildCommentTree(comments, comment.comment_id),
      }));
  }
}
