import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Comment } from './entities/comment.entity';
import { CommentDto } from './dtos/comment.dto';
import { RedisEnum } from 'src/utils/enums/enum';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';
import { CommentUtil } from './comment.util';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { MinioClientService } from '../minio-client/minio-client.service';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';
import { PostUtil } from '../post/post.util';
import * as _ from 'lodash';

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
    return await this.enrichCommentWithMediaUrls(
      await this.commentUtil.getCommentById(comment_id),
    );
  }

  async getCommentsByPost(
    user_id: number,
    post_id: number,
  ): Promise<CommentWithChildren[]> {
    const cacheKey = `${RedisEnum.commentTree}:${post_id}`;

    try {
      const cachedData = await this.redisCacheService.get(cacheKey);
      let parsedTree: CommentWithChildren[] | null = null;

      try {
        parsedTree = JSON.parse(cachedData);
      } catch (parseError) {
        throw new InternalServerErrorException(
          `[getCommentsByPost] Failed to parse cached data for key ${cacheKey}. Error: ${parseError.message}`,
        );
      }

      if (Array.isArray(parsedTree)) {
        try {
          return await this.enrichCommentTree(parsedTree);
        } catch (enrichError) {
          throw new InternalServerErrorException(
            `[getCommentsByPost] Failed to enrich comment tree from cache for key ${cacheKey}. Error: ${enrichError.message}`,
          );
        }
      }
    } catch (cacheReadError) {
      throw new InternalServerErrorException(
        `[getCommentsByPost] Failed to read from Redis cache for key ${cacheKey}. Error: ${cacheReadError.message}`,
      );
    }

    const allComments = await this.commentUtil.getCommentsByPostIdWithRelations(
      user_id,
      post_id,
    );

    if (!allComments || allComments.length === 0) {
      return [];
    }

    const commentTree = this.buildCommentTree(allComments);

    let enrichedTree: CommentWithChildren[] = [];
    try {
      enrichedTree = await this.enrichCommentTree(commentTree);
    } catch (enrichDbError) {
      enrichedTree = commentTree;
    }

    if (commentTree.length > 0) {
      try {
        await this.redisCacheService.set(
          cacheKey,
          commentTree,
          convertToSeconds(env.redis.ttl),
        );
      } catch (cacheSetError) {
        throw new InternalServerErrorException(
          `[getCommentsByPost] Failed to set cache for key ${cacheKey}. Error: ${cacheSetError.message}`,
        );
      }
    }

    return enrichedTree;
  }

  private async enrichCommentTree(
    tree: CommentWithChildren[],
  ): Promise<CommentWithChildren[]> {
    if (!Array.isArray(tree)) {
      return [];
    }
    if (tree.length === 0) {
      return [];
    }

    const resTree: CommentWithChildren[] = _.cloneDeep(tree);

    const results = await Promise.allSettled(
      resTree.map((node) => this.enrichNodeRecursively(node)),
    );

    const enrichedTree: CommentWithChildren[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        enrichedTree.push(result.value);
      } else {
        enrichedTree.push(tree[index]);
      }
    });
    return enrichedTree;
  }

  private async enrichNodeRecursively(
    node: CommentWithChildren,
  ): Promise<CommentWithChildren> {
    let enrichedNode: CommentWithChildren;
    try {
      enrichedNode = await this.enrichCommentWithMediaUrls(node);
    } catch (enrichError) {
      enrichedNode = { ...node };
    }

    if (
      enrichedNode.children &&
      Array.isArray(enrichedNode.children) &&
      enrichedNode.children.length > 0
    ) {
      const childResults = await Promise.allSettled(
        enrichedNode.children.map((child) => this.enrichNodeRecursively(child)),
      );
      const enrichedChildren: CommentWithChildren[] = [];
      childResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          enrichedChildren.push(result.value);
        } else {
          enrichedChildren.push(enrichedNode.children[index]);
        }
      });
      enrichedNode.children = enrichedChildren;
    } else {
      enrichedNode.children = [];
    }

    return enrichedNode;
  }

  async createComment(
    post_id: number,
    userId: number,
    commentDto: CommentDto,
  ): Promise<any> {
    const { body, parent_id, isPure } = commentDto;

    if (!body && (parent_id === null || parent_id === undefined) && !isPure) {
      throw new BadRequestException('Post must have a body or be a repost.');
    }

    const postExists = await this.postUtil.getPostById(post_id);
    if (!postExists) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }

    if (parent_id) {
      const parentComment = await this.commentUtil.getCommentById(parent_id);
      if (!parentComment) {
        throw new BadRequestException(
          `Parent comment (ID: ${parent_id}) not found.`,
        );
      }
      if (parentComment.post_id !== post_id) {
        throw new BadRequestException(
          `Parent comment does not belong to the same post.`,
        );
      }
    }

    try {
      const commentData: CreateCommentData = {
        body,
        parent_id,
        image: null,
        video: null,
      };
      const newComment = await this.commentUtil.createComment(
        post_id,
        userId,
        commentData,
      );

      const cacheKey = `${RedisEnum.commentTree}:${post_id}`;
      await this.redisCacheService
        .del(cacheKey)
        .catch((e) => console.error('Cache del error:', e));

      this.sendNotificationsAfterComment(
        userId,
        newComment,
        postExists.user_id,
        parent_id,
      );

      return await this.enrichCommentWithMediaUrls(newComment);
    } catch (error) {
      console.log(error.message);
      throw new InternalServerErrorException('Failed to create comment.');
    }
  }

  async updateComment(
    requestingUserId: number,
    comment_id: number,
    commentDto: CommentDto,
  ): Promise<boolean> {
    const comment = await this.commentUtil.getCommentById(comment_id);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${comment_id} not found.`);
    }
    if (comment.user_id !== requestingUserId) {
      throw new ForbiddenException(
        'You are not allowed to update this comment.',
      );
    }
    if (!commentDto.body) {
      throw new BadRequestException('Comment body cannot be empty for update.');
    }

    try {
      const success = await this.commentUtil.updateCommentBody(comment_id, {
        body: commentDto.body,
      });

      if (success) {
        const cacheKey = `${RedisEnum.commentTree}:${comment.post_id}`;
        await this.redisCacheService
          .del(cacheKey)
          .catch((e) => console.error('Cache del error:', e));
      }

      return success;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update comment.');
    }
  }

  async attachFileToComment(
    requestingUserId: number,
    comment_id: number,
    fileType: 'image' | 'video',
    objectName: string | null,
    thumbnail: string | null,
  ): Promise<boolean> {
    const comment = await this.commentUtil.getCommentById(comment_id);

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${comment_id} not found.`);
    }
    if (comment.user_id !== requestingUserId) {
      throw new ForbiddenException(
        'You are not allowed to modify this comment.',
      );
    }

    const oldObjectName = fileType === 'image' ? comment.image : comment.video;

    let success = false;
    try {
      if (fileType === 'image') {
        success = await this.commentUtil.updateCommentImage(
          comment_id,
          objectName,
        );
      } else {
        success = await this.commentUtil.updateCommentVideo(
          comment_id,
          objectName,
          thumbnail,
        );
      }

      if (success) {
        const cacheKey = `${RedisEnum.commentTree}:${comment.post_id}`;
        await this.redisCacheService.del(cacheKey);

        if (oldObjectName && oldObjectName !== objectName) {
          await this.minioClientService.deleteFile(oldObjectName);
        }
      }
      return success;
    } catch (error) {
      if (objectName && !oldObjectName) {
        await this.minioClientService
          .deleteFile(objectName)
          .catch((rbError) =>
            console.error('Rollback delete failed:', rbError),
          );
      }
      throw new InternalServerErrorException(
        `Failed to attach ${fileType} to comment.`,
      );
    }
  }

  async setStatus(comment_id: number, status: string) {
    try {
      return await this.commentUtil.updateStatus(comment_id, status);
    } catch (error) {
      throw error;
    }
  }

  async deleteComment(
    requestingUserId: number,
    comment_id: number,
    role: string,
  ): Promise<number> {
    const comment = await this.commentUtil.getCommentById(comment_id);

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${comment_id} not found.`);
    }

    if (
      comment.user_id !== requestingUserId &&
      !['admin', 'superadmin'].some((r) => role.includes(r))
    ) {
      throw new ForbiddenException(
        'You are not allowed to delete this comment.',
      );
    }

    const imageToDelete = comment.image;
    const videoToDelete = comment.video;
    const post_id = comment.post_id;
    const target = `posts/user_${comment.user_id}/hlses/post_${post_id}`;

    try {
      const affectedNumber = await this.commentUtil.deleteComment(
        comment_id,
        post_id,
      );

      if (affectedNumber > -1) {
        const cacheKey = `${RedisEnum.commentTree}:${post_id}`;
        await this.redisCacheService.del(cacheKey);

        const fileDeletes = [];
        if (imageToDelete)
          fileDeletes.push(this.minioClientService.deleteFile(imageToDelete));
        if (videoToDelete)
          fileDeletes.push(this.minioClientService.deleteFolder(target));

        await Promise.all(fileDeletes);
      }
      return affectedNumber;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete comment in Service.',
      );
    }
  }

  private async sendNotificationsAfterComment(
    commenterId: number,
    newComment: Comment,
    postOwnerId: number,
    parentCommentId?: number,
  ): Promise<void> {
    try {
      const commenterProfile =
        await this.profileService.getProfile(commenterId);
      if (!commenterProfile) return;

      const notificationPromises = [];

      if (postOwnerId !== commenterId) {
        const notificationTypePost = 'NEW_COMMENT';
        const notificationBody = {
          commenter: {
            user_id: commenterProfile.user_id,
            displayName: commenterProfile.nickname,
            avatarUrl: commenterProfile.avatar,
          },
          post: { id: newComment.post_id },
          comment: {
            id: newComment.comment_id,
          },
          message: `${commenterProfile.nickname || `User ${commenterId}`} commented on your post.`,
          createdAt: new Date().toISOString(),
        };
        notificationPromises.push(
          this.notificationService.createNotification(
            postOwnerId,
            notificationTypePost,
            notificationBody,
          ),
        );
      }

      if (parentCommentId) {
        const parentComment =
          await this.commentUtil.getCommentById(parentCommentId);
        if (
          parentComment &&
          parentComment.user_id !== commenterId &&
          parentComment.user_id !== postOwnerId
        ) {
          const notificationTypeReply = 'REPLY_COMMENT';
          const notificationBody = {
            replier: {
              user_id: commenterProfile.user_id,
              displayName: commenterProfile.nickname,
              avatarUrl: commenterProfile.avatar,
            },
            post: { id: newComment.post_id },
            parentComment: { id: parentComment.comment_id },
            replyComment: {
              id: newComment.comment_id,
            },
            message: `${commenterProfile.nickname || `User ${commenterId}`} replied to your comment.`,
            createdAt: new Date().toISOString(),
          };
          notificationPromises.push(
            this.notificationService.createNotification(
              parentComment.user_id,
              notificationTypeReply,
              notificationBody,
            ),
          );
        }
      }

      if (notificationPromises.length > 0) {
        await Promise.allSettled(notificationPromises);
      }
    } catch (error) {
      console.error(
        `[Comment Service] Error sending notifications for comment ${newComment.comment_id}:`,
        error,
      );
    }
  }

  private buildCommentTree(
    comments: Comment[],
    parentId: number | null = null,
  ): CommentWithChildren[] {
    let resComments: Comment[] = comments;
    return resComments
      .filter((comment) => comment.parent_id === parentId)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )
      .map((comment) => ({
        ...comment,
        children: this.buildCommentTree(comments, comment.comment_id),
      }));
  }

  private async enrichCommentWithMediaUrls(
    comment: Comment,
  ): Promise<CommentWithChildren> {
    const enrichedComment: CommentWithChildren = { ...comment };
    if (comment.image) {
      enrichedComment.image =
        await this.minioClientService.generatePresignedDownloadUrl(
          comment.image,
        );
    }
    if (comment.video) {
      enrichedComment.video =
        await this.minioClientService.generatePresignedDownloadUrl(
          comment.video,
        );
      if (comment.video_thumbnail) {
        enrichedComment.video_thumbnail =
          await this.minioClientService.generatePresignedDownloadUrl(
            comment.video_thumbnail,
          );
      }
    }
    if (comment.profile?.avatar) {
      enrichedComment.profile.avatar =
        await this.minioClientService.generatePresignedDownloadUrl(
          comment.profile.avatar,
        );
    }
    if (comment.profile?.background) {
      enrichedComment.profile.background =
        await this.minioClientService.generatePresignedDownloadUrl(
          comment.profile.background,
        );
    }

    return enrichedComment;
  }
}
