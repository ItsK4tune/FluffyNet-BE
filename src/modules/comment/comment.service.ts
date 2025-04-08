import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

interface CreateCommentData {
  body?: string;
  image?: string | null;
  video?: string | null;
  parent_id?: number | null;
}

interface CommentWithChildren extends Comment {
  children?: CommentWithChildren[];
  imageUrl?: string | null;
  videoUrl?: string | null;
}

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

  async getCommentById(comment_id: number): Promise<Comment> {
    return await this.enrichCommentWithMediaUrls(await this.commentUtil.getCommentById(comment_id));
  }

  async getCommentsByPost(post_id: number): Promise<CommentWithChildren[]> {
    const cacheKey = `${RedisEnum.commentTree}:${post_id}`; 

    try {
      const cachedTree = await this.redisCacheService.get(cacheKey);
      if (cachedTree) {
        const parsedTree = JSON.parse(cachedTree) as CommentWithChildren[];
        const enrichNode = async (node: CommentWithChildren): Promise<CommentWithChildren> => {
          const enrichedNode = await this.enrichCommentWithMediaUrls(node);
          if (node.children && node.children.length > 0) {
            enrichedNode.children = await Promise.all(node.children.map(enrichNode));
          }
          return enrichedNode;
        };
        return Promise.all(parsedTree.map(enrichNode));
      }
    } catch (cacheError) {
      throw new InternalServerErrorException(`Cache error`);
    }

    const allComments = await this.commentUtil.getCommentsByPostIdWithRelations(post_id); 
    const commentTree = this.buildCommentTree(allComments); 
    const enrichNode = async (node: CommentWithChildren): Promise<CommentWithChildren> => {
      const enrichedNode = await this.enrichCommentWithMediaUrls(node);
        if (node.children && node.children.length > 0) {
            enrichedNode.children = await Promise.all(node.children.map(enrichNode));
        }
        return enrichedNode;
    };
    const enrichedTree = await Promise.all(commentTree.map(enrichNode));

    const treeToCache = this.buildCommentTree(allComments); 
    if (treeToCache.length > 0) {
      try {
        await this.redisCacheService.set(cacheKey, JSON.stringify(treeToCache), convertToSeconds(env.redis.ttl));
      } catch (cacheSetError) {
        throw new InternalServerErrorException(`Cache error`);
      }
    }
    return enrichedTree;
  }

  async createComment(
    post_id: number,
    userId: number,
    commentDto: CommentDto,
  ): Promise<any> { 
    const { body, parent_id } = commentDto;
  
    if (!body) {
      throw new BadRequestException('Comment body cannot be empty.');
    }
  
    const postExists = await this.postUtil.getPostById(post_id);
    if (!postExists) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }
      
    if (parent_id) {
      const parentComment = await this.commentUtil.getCommentById(parent_id);
      if (!parentComment) {
        throw new BadRequestException(`Parent comment (ID: ${parent_id}) not found.`);
      }
      if (parentComment.post_id !== post_id) {
        throw new BadRequestException(`Parent comment does not belong to the same post.`);
      }
    }
      
    try {
      const commentData: CreateCommentData = {
        body,
        parent_id,
        image: null,
        video: null,
      };
      const newComment = await this.commentUtil.createComment(post_id, userId, commentData);
      
      const cacheKey = `${RedisEnum.commentTree}:${post_id}`;
      await this.redisCacheService.del(cacheKey).catch(e => console.error("Cache del error:", e));
      
      this.sendNotificationsAfterComment(userId, newComment, postExists.user_id, parent_id)

      return await this.enrichCommentWithMediaUrls(newComment);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create comment.');
    }
  }

  async updateComment(
    requestingUserId: number,
    commentId: number,
    commentDto: CommentDto,
  ): Promise<boolean> {
    const comment = await this.commentUtil.getCommentById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }
    if (comment.user_id !== requestingUserId) {
      throw new ForbiddenException('You are not allowed to update this comment.');
    }
    if (!commentDto.body) {
      throw new BadRequestException("Comment body cannot be empty for update.");
    }
  
    try {
      const success = await this.commentUtil.updateCommentBody(commentId, { body: commentDto.body });
      
      if (success) {
        const cacheKey = `${RedisEnum.commentTree}:${comment.post_id}`;
        await this.redisCacheService.del(cacheKey).catch(e => console.error("Cache del error:", e));
      }
        return success;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update comment.');
    }
  }

  async attachFileToComment(requestingUserId: number, commentId: number, fileType: 'image' | 'video', objectName: string | null): Promise<boolean> {
    const comment = await this.commentUtil.getCommentById(commentId);
      
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }
    if (comment.user_id !== requestingUserId) {
      throw new ForbiddenException('You are not allowed to modify this comment.');
    }
    
    const oldObjectName = fileType === 'image' ? comment.image : comment.video;
    
    let success = false;
    try {
      if (fileType === 'image') {
        success = await this.commentUtil.updateCommentImage(commentId, objectName);
      } else {
        success = await this.commentUtil.updateCommentVideo(commentId, objectName);
      }
      
      if (success) {
        const cacheKey = `${RedisEnum.commentTree}:${comment.post_id}`;
        await this.redisCacheService.del(cacheKey)
        
        if (oldObjectName && oldObjectName !== objectName) {
          await this.minioClientService.deleteFile(oldObjectName)
        }
      }
      return success;
    } catch (error) {
      if (objectName && !oldObjectName) {
        await this.minioClientService.deleteFile(objectName).catch(rbError => console.error('Rollback delete failed:', rbError));
      }
      throw new InternalServerErrorException(`Failed to attach ${fileType} to comment.`);
    }
  }

  async deleteComment(requestingUserId: number, commentId: number, role: string): Promise<boolean> {
    const comment = await this.commentUtil.getCommentById(commentId); 
   
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }
    
    if (comment.user_id !== requestingUserId && !['admin', 'superadmin'].some(r => role.includes(r))) {
      throw new ForbiddenException('You are not allowed to delete this comment.');
    }
      
    const imageToDelete = comment.image;
    const videoToDelete = comment.video;
    const post_id = comment.post_id;
      
    try {
      const success = await this.commentUtil.deleteComment(commentId);
      
      if (success) {
        const cacheKey = `${RedisEnum.commentTree}:${post_id}`;
        await this.redisCacheService.del(cacheKey)
        
        if (imageToDelete) {
          await this.minioClientService.deleteFile(imageToDelete)
        }
        if (videoToDelete) {
            await this.minioClientService.deleteFile(videoToDelete)
        }
      }
      return success;
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete comment.');
    }
  }
    
  private async sendNotificationsAfterComment(commenterId: number, newComment: Comment, postOwnerId: number, parentCommentId?: number): Promise<void> {
    try {
      const commenterProfile = await this.profileService.getProfile(commenterId);
      if (!commenterProfile) return; 
      
      const notificationPromises = [];
      
      if (postOwnerId !== commenterId) {
        const notificationTypePost = 'NEW_COMMENT';
        const notificationBody = {
          commenter: {
            user_id: commenterProfile.user_id,
            displayName: commenterProfile.name,
            avatarUrl: commenterProfile.avatar,
          },
          post: { id: newComment.post_id },
          comment: {
            id: newComment.comment_id,
          },
          message: `${commenterProfile.name || `User ${commenterId}`} commented on your post.`,
          createdAt: new Date().toISOString(),
        };
        notificationPromises.push(
          this.notificationService.createNotification(postOwnerId, notificationTypePost, notificationBody)
        )
      }
            
      if (parentCommentId) {
        const parentComment = await this.commentUtil.getCommentById(parentCommentId);
        if (parentComment && parentComment.user_id !== commenterId && parentComment.user_id !== postOwnerId) {
          const notificationTypeReply = 'REPLY_COMMENT';
          const notificationBody = {
            replier: {
              user_id: commenterProfile.user_id,
              displayName: commenterProfile.name,
              avatarUrl: commenterProfile.avatar,
            },
            post: { id: newComment.post_id },
            parentComment: { id: parentComment.comment_id },
            replyComment: {
              id: newComment.comment_id,
            },
            message: `${commenterProfile.name || `User ${commenterId}`} replied to your comment.`,
            createdAt: new Date().toISOString(),
          };
          notificationPromises.push(
            this.notificationService.createNotification(parentComment.user_id, notificationTypeReply, notificationBody)
          );
        }
      }
            
      if (notificationPromises.length > 0) {
        await Promise.allSettled(notificationPromises);
      }
    } catch (error) {
      console.error(`[Comment Service] Error sending notifications for comment ${newComment.comment_id}:`, error);
    }
  }
  
  private buildCommentTree(comments: Comment[], parentId: number | null = null): CommentWithChildren[] {
    return comments
      .filter((comment) => comment.parent_id === parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) 
      .map((comment) => ({
            ...(comment as any).get({ plain: true }),
            children: this.buildCommentTree(comments, comment.comment_id),
      }));
  }

  private async enrichCommentWithMediaUrls(comment: Comment): Promise<CommentWithChildren> {
    const enrichedComment: CommentWithChildren = { ...comment };
      if (comment.image) {
        enrichedComment.imageUrl = await this.minioClientService.generatePresignedDownloadUrl(comment.image);
      }
      if (comment.video) {
          enrichedComment.videoUrl = await this.minioClientService.generatePresignedDownloadUrl(comment.video);
      }
      if (comment.user?.avatar) {
        if (!enrichedComment.user) enrichedComment.user = {} as Profile; 
        (enrichedComment.user as any).avatarUrl = await this.minioClientService.generatePresignedDownloadUrl(comment.user.avatar);
      }

    return enrichedComment;
  }
}