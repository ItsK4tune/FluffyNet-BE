import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PostUtil } from 'src/modules/post/post.util';
import { PostDto } from './dto/post.dto';
import { Post } from './entities/post.entity';
import { MinioClientService } from '../minio-client/minio-client.service';
import { FollowService } from '../follow/follow.service';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';
import { Profile } from '../profile/entities/profile.entity';

interface CreatePostData {
  body?: string;
  image?: string | null;
  video?: string | null;
  repost_id?: number | null;
}

interface UpdatePostData {
  body?: string;
}

@Injectable()
export class PostService {
  constructor(
    private readonly postUtil: PostUtil,
    private readonly minioClientService: MinioClientService,
    private readonly followService: FollowService,
    private readonly notificationService: NotificationService,
    private readonly profileService: ProfileService,
  ) { }

  async getAllPosts({ skip, take }): Promise<Post[]> {
    return await Promise.all((await this.postUtil.getAllPosts({ skip, take })).map(post => this.enrichPostWithMediaUrls(post)));
  }

  async getPostsOfFollowing(user_id: number): Promise<Post[]> {
    const followingList = await this.followService.followingList(user_id);
    if (!followingList || followingList.length === 0) return [];
    const follows = followingList.map(follow => follow.following_id);
    const posts = await this.postUtil.getPostsOfFollowing(follows);
    return await Promise.all(posts.map(post => this.enrichPostWithMediaUrls(post)));
  }

  async findOneById(post_id: number): Promise<Post> {
    return await this.enrichPostWithMediaUrls(await this.postUtil.getPostById(post_id));
  }

  async createPost(user_id: number, data: PostDto): Promise<Post> {
    const { body, repost_id } = data;

    if (!body && (repost_id === null || repost_id === undefined)) {
      throw new BadRequestException('Post must have a body or be a repost.');
    }

    if (repost_id && body) {
      throw new BadRequestException('A repost cannot have a new body.');
    }

    let repostOrigin: Post | null = null;
    if (repost_id) {
      repostOrigin = await this.postUtil.getPostById(repost_id);
      if (!repostOrigin) {
        throw new BadRequestException(`Original post (ID: ${repost_id}) not found for repost.`);
      }
    }

    try {
      const postData: CreatePostData = {
        body: body || null,
        repost_id: repost_id,
        image: null,
        video: null,
      };

      const newPost = await this.postUtil.createPost(user_id, postData);

      if (repost_id) {
        this.sendRepostNotification(user_id, repostOrigin.user_id, newPost.post_id, repostOrigin.post_id)
      }

      this.sendNewPostNotifications(user_id, newPost.post_id);

      return await this.enrichPostWithMediaUrls(newPost);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create post.');
    }
  }

  async updatePost(requestingUserId: number, post_id: number, role: string, data: PostDto): Promise<boolean> {
    const post = await this.postUtil.getPostById(post_id);

    if (!post) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }

    if (post.user_id !== requestingUserId && !['admin', 'superadmin'].some(r => role.includes(r))) {
      throw new ForbiddenException('You are not allowed to update this post.');
    }

    const updateData: UpdatePostData = { body: data.body };

    try {
      const success = await this.postUtil.updatePost(post_id, updateData);
      return success;
    } catch (error) {
      throw new InternalServerErrorException('Failed to update post.');
    }
  }

  async attachFileToPost(requestingUserId: number, post_id: number, role: string, fileType: 'image' | 'video', objectName: string | null): Promise<boolean> {
    const post = await this.postUtil.getPostById(post_id);

    if (!post) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }

    if (post.user_id !== requestingUserId && !['admin', 'superadmin'].some(r => role.includes(r))) {
      throw new ForbiddenException('You are not allowed to modify this post.');
    }

    if (post.repost_id) {
      throw new BadRequestException('Cannot attach files to a repost.');
    }

    const oldObjectName = fileType === 'image' ? post.image : post.video;

    let success = false;
    try {
      if (fileType === 'image') {
        success = await this.postUtil.updatePostImage(post_id, objectName);
      } else {
        success = await this.postUtil.updatePostVideo(post_id, objectName);
      }

      if (success && oldObjectName && oldObjectName !== objectName) {
        await this.minioClientService.deleteFile(oldObjectName)
      }
      return success;
    } catch (error) {
      if (objectName && !oldObjectName) {
        await this.minioClientService.deleteFile(objectName)
      }
      throw new InternalServerErrorException(`Failed to attach ${fileType} to post.`);
    }
  }

  async deletePost(requestingUserId: number, post_id: number, role: string): Promise<boolean> {
    const post = await this.postUtil.getPostById(post_id);

    if (!post) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }

    if (post.user_id !== requestingUserId && !['admin', 'superadmin'].some(r => role.includes(r))) {
      throw new ForbiddenException('You are not allowed to delete this post.');
    }

    const imageToDelete = post.image;
    const videoToDelete = post.video;

    try {
      const success = await this.postUtil.deletePost(post_id);

      if (success) {
        if (imageToDelete) {
          await this.minioClientService.deleteFile(imageToDelete)
        }
        if (videoToDelete) {
          await this.minioClientService.deleteFile(videoToDelete)
        }
      }
      return success;
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete post.');
    }
  }

  private async sendNewPostNotifications(authorId: number, post_id: number): Promise<void> {
    try {
      const followers = await this.followService.followerList(authorId);
      const followerIds = followers.map(f => f.follower_id).filter(id => id !== authorId);

      if (followerIds.length === 0) {
        return;
      }

      const authorProfile = await this.profileService.getProfile(authorId) as Profile;
      if (!authorProfile) return;

      const notificationType = 'NEW_POST';
      const notificationBody = {
        author: {
          user_id: authorProfile.user_id,
          displayName: authorProfile.name,
          avatarUrl: authorProfile.avatar,
        },
        post: {
          id: post_id,
        },
        message: `${authorProfile.name || `User ${authorId}`} has shared a new post.`,
        createdAt: new Date().toISOString(),
      };

      const notificationPromises = followerIds.map(followerId =>
        this.notificationService.createNotification(followerId, notificationType, notificationBody)
      );
      await Promise.allSettled(notificationPromises);
    } catch (error) {
      // TODO: implement retry mechanism
    }
  }

  private async sendRepostNotification(reposterId: number, originalAuthorId: number, newPostId: number, originalPostId: number): Promise<void> {
    if (reposterId === originalAuthorId) return;

    try {
      const reposterProfile = await this.profileService.getProfile(reposterId) as Profile;
      if (!reposterProfile) return;

      const notificationType = 'REPOST';
      const notificationBody = {
        reposter: {
          user_id: reposterProfile.user_id,
          displayName: reposterProfile.name,
          avatarUrl: reposterProfile.avatar,
        },
        originalPost: { id: originalPostId },
        newPost: { id: newPostId },
        message: `${reposterProfile.name || `User ${reposterId}`} reposted your post.`,
        createdAt: new Date().toISOString(),
      };

      await this.notificationService.createNotification(originalAuthorId, notificationType, notificationBody);
    } catch (error) {
      // TODO: implement retry mechanism
    }
  }

  private async enrichPostWithMediaUrls(post: Post | null): Promise<Post | null> {
    if (!post) return null;

    const enrichedPost: Post = { ...post };

    if (post.image) {
      try {
        enrichedPost.image = await this.minioClientService.generatePresignedDownloadUrl(post.image, 60 * 60);
      } catch (error) {
        console.error(`Failed to get download URL for image ${post.image}:`, error);
        enrichedPost.image = null;
      }
    } else {
      enrichedPost.image = null;
    }

    if (post.video) {
      try {
        enrichedPost.video = await this.minioClientService.generatePresignedDownloadUrl(post.video, 60 * 60);
      } catch (error) {
        console.error(`Failed to get download URL for video ${post.video}:`, error);
        enrichedPost.video = null;
      }
    } else {
      enrichedPost.video = null;
    }

    return enrichedPost;
  }
}
