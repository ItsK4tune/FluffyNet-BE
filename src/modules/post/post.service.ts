import { Injectable } from '@nestjs/common';
import { PostUtil } from 'src/modules/post/post.util';
import { PostDto } from './dto/post.dto';
import { Post } from './entities/post.entity';
import { MinioClientService } from '../minio-client/minio-client.service';
import { MinioEnum } from 'src/utils/enums/enum';
import { FollowService } from '../follow/follow.service';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';
import { Profile } from '../profile/entities/profile.entity';

@Injectable()
export class PostService {
  constructor(
    private readonly postUtil: PostUtil,
    private readonly minioClientService: MinioClientService,
    private readonly followService: FollowService,
    private readonly notificationService: NotificationService,
    private readonly profileService: ProfileService,
  ) {}

  async getAllPosts(): Promise<Post[]> {
    return this.postUtil.getAllPosts();
  }

  async getPostsOfFollowing(user_id: number): Promise<Post[]> {
    const list = await this.followService.followingList(user_id);

    if (!list || list.length === 0) return [];

    const follows = list.map(follow => follow.following_id);

    return this.postUtil.getPostsOfFollowing(follows);
  }

  async findOneById(post_id: number): Promise<Post> {
    return this.postUtil.getPostById(post_id);
  }

  async createPost(user_id: number, data: PostDto, files: { image?: any, video?: any }): Promise<Boolean> {
    if (!data.body && !files.image && !files.video )  return false;
    const { repost_id } = data;
    
    let repost: Post | null = null;
    if (repost_id) {
      repost = await this.postUtil.getPostById(repost_id);
      if (!repost)
        return null;
    }

    let savedImage: string | null = null;
    let savedVideo: string | null = null;

    if (files?.image?.[0]) {
      const uploadedAvatar = await this.minioClientService.upload(files.image[0], MinioEnum.image);
      savedImage = uploadedAvatar;
    }
    if (files?.video?.[0]) {
      const uploadedBackground = await this.minioClientService.upload(files.video[0], MinioEnum.video);
      savedVideo = uploadedBackground;
    }

    const postData: Partial<PostDto> & { image?: string; video?: string } = {
      ...data,
      image: savedImage,
      video: savedVideo,
    };

    try {
      const newPost = await this.postUtil.createPost(user_id, postData); 
      await Promise.allSettled([
          this.sendNewPostNotifications(user_id, newPost.post_id),
           ...(repost ? [this.sendRepostNotification(user_id, repost.user_id, newPost.post_id, repost.post_id)] : [])
      ]);
      return true; 
    } catch (error) {
      return false;
    }
  }

  async updatePost(user_id: number, post_id: number, data: PostDto, files: { image?: any, video?: any }) {
    if (!data.body && !data.repost_id && !files.image && !files.video )  return null;
    const { repost_id } = data;
    const post = await this.postUtil.getPostById(post_id);

    if (!post)  return null;
    if (post.user_id !== user_id) return false;

    if (repost_id) {
      const repost = await this.postUtil.getPostById(repost_id);
      if (!repost)
        return null;
    }

    let savedImage: string | null = null;
    let savedVideo: string | null = null;

    if (files?.image?.[0]) {
      const uploadedAvatar = await this.minioClientService.upload(files.image[0], MinioEnum.image);
      savedImage = uploadedAvatar;
    }
    if (files?.video?.[0]) {
      const uploadedBackground = await this.minioClientService.upload(files.video[0], MinioEnum.video);
      savedVideo = uploadedBackground;
    }

    const patchData: Partial<PostDto> & { image?: string; video?: string } = {
      ...data,
      image: savedImage,
      video: savedVideo,
    };

    return this.postUtil.updatePost(post_id, patchData);
  }

  async deletePost(user_id: number, post_id: number) {
    const post = await this.postUtil.getPostById(post_id);

    if (!post)  return null;
    if (post.user_id !== user_id) return false;
    
    return this.postUtil.deletePost(post_id);
  }

  private async sendNewPostNotifications(authorId: number, postId: number): Promise<void> {
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
            id: postId,
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
}
