import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

  async getPostsByUserId(
    user_id: number,
    target_id: number,
    { skip, take, order },
  ): Promise<Post[]> {
    return Promise.all(
      (
        await this.postUtil.getPostByUserId(user_id, target_id, {
          skip,
          take,
          order,
        })
      ).map((post) => this.enrichPostWithMediaUrls(post)),
    );
  }

  async getAllPosts(user_id: number, { skip, take, order }): Promise<Post[]> {
    return Promise.all(
      (await this.postUtil.getAllPosts(user_id, { skip, take, order })).map(
        (post) => this.enrichPostWithMediaUrls(post),
      ),
    );
  }

  async getPostsOfFollowing(
    user_id: number,
    { skip, take, order },
  ): Promise<Post[]> {
    const followingList = await this.followService.followingList(user_id);
    if (!followingList || followingList.length === 0) return [];
    const follows = followingList.map((follow) => follow.following.user_id);
    const posts = await this.postUtil.getPostsOfFollowing(follows, user_id, {
      skip,
      take,
      order,
    });
    return await Promise.all(
      posts.map((post) => this.enrichPostWithMediaUrls(post)),
    );
  }

  async findOneById(post_id: number): Promise<Post> {
    return await this.enrichPostWithMediaUrls(
      await this.postUtil.getPostById(post_id),
    );
  }

  async createPost(user_id: number, data: PostDto): Promise<Post> {
    const { body, repost_id, isPure } = data;

    if (!body && (repost_id === null || repost_id === undefined) && !isPure) {
      throw new BadRequestException('Post must have a body or be a repost.');
    }

    let repostOrigin: Post | null = null;
    if (repost_id) {
      repostOrigin = await this.postUtil.getPostById(repost_id);
      if (!repostOrigin) {
        throw new BadRequestException(
          `Original post (ID: ${repost_id}) not found for repost.`,
        );
      }
    }

    try {
      const postData: CreatePostData = {
        body: body || null,
        repost_id: repost_id || null,
        image: null,
        video: null,
      };

      const newPost = await this.postUtil.createPost(user_id, postData);

      if (repost_id) {
        this.enrichPostWithMediaUrls(newPost.repostOrigin);
        this.sendRepostNotification(
          user_id,
          repostOrigin.user_id,
          newPost.post_id,
          repostOrigin.post_id,
        );
      }

      this.sendNewPostNotifications(user_id, newPost.post_id);

      return await this.enrichPostWithMediaUrls(newPost);
    } catch (error) {
      throw new InternalServerErrorException('Failed to create post.');
    }
  }

  async updatePost(
    requestingUserId: number,
    post_id: number,
    role: string,
    data: PostDto,
  ): Promise<boolean> {
    const post = await this.postUtil.getPostById(post_id);

    if (!post) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }

    if (
      post.user_id !== requestingUserId &&
      !['admin', 'superadmin'].some((r) => role.includes(r))
    ) {
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

  async attachFileToPost(
    requestingUserId: number,
    post_id: number,
    role: string,
    fileType: 'image' | 'video',
    objectName: string | null,
    thumbnail: string | null = null,
  ): Promise<boolean> {
    const post = await this.postUtil.getPostById(post_id);

    if (!post) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }

    if (
      post.user_id !== requestingUserId &&
      !['admin', 'superadmin'].some((r) => role.includes(r))
    ) {
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
        success = await this.postUtil.updatePostVideo(
          post_id,
          objectName,
          thumbnail,
        );
      }

      if (success && oldObjectName && oldObjectName !== objectName) {
        await this.minioClientService.deleteFile(oldObjectName);
      }
      return success;
    } catch (error) {
      if (objectName && !oldObjectName) {
        await this.minioClientService.deleteFile(objectName);
      }
      throw new InternalServerErrorException(
        `Failed to attach ${fileType} to post.`,
      );
    }
  }

  async setStatus(post_id: number, status: string) {
    try {
      return await this.postUtil.updateStatus(post_id, status);
    } catch (error) {
      throw error;
    }
  }

  async deletePost(
    requestingUserId: number,
    post_id: number,
    role: string,
  ): Promise<boolean> {
    const post = await this.postUtil.getPostById(post_id);
    const postRepost = await this.postUtil.getPostsByRepostId(post_id);

    if (!post) {
      throw new NotFoundException(`Post with ID ${post_id} not found.`);
    }

    if (
      post.user_id !== requestingUserId &&
      !['admin', 'superadmin'].some((r) => role.includes(r))
    ) {
      throw new ForbiddenException('You are not allowed to delete this post.');
    }

    const imageToDelete = post.image;
    const videoToDelete = post.video;
    const target = `posts/user_${post.user_id}/hlses/post_${post_id}`;

    try {
      if (postRepost.length) {
        for (const repost of postRepost) {
          repost.is_repost_deleted = true;
          await this.postUtil.save(repost);
        }
      }

      const success = await this.postUtil.deletePost(post_id);

      if (success) {
        if (imageToDelete) {
          await this.minioClientService.deleteFile(imageToDelete);
        }
        if (videoToDelete) {
          await this.minioClientService.deleteFolder(target);
        }
      }

      return success;
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete post.');
    }
  }

  private async sendNewPostNotifications(
    authorId: number,
    post_id: number,
  ): Promise<void> {
    try {
      const followers = await this.followService.followerList(authorId);
      const followerIds = followers
        .map((f) => f.follower_id)
        .filter((id) => id !== authorId);

      if (followerIds.length === 0) {
        return;
      }

      const authorProfile = (await this.profileService.getProfile(
        authorId,
      )) as Profile;
      if (!authorProfile) return;

      const notificationType = 'NEW_POST';
      const notificationBody = {
        author: {
          user_id: authorProfile.user_id,
          displayName: authorProfile.nickname,
          avatarUrl: authorProfile.avatar,
        },
        post: {
          id: post_id,
        },
        message: `${authorProfile.nickname || `User ${authorId}`} has shared a new post.`,
        createdAt: new Date().toISOString(),
      };

      const notificationPromises = followerIds.map((followerId) =>
        this.notificationService.createNotification(
          followerId,
          notificationType,
          notificationBody,
        ),
      );
      await Promise.allSettled(notificationPromises);
    } catch (error) {
      // TODO: implement retry mechanism
    }
  }

  private async sendRepostNotification(
    reposterId: number,
    originalAuthorId: number,
    newPostId: number,
    originalPostId: number,
  ): Promise<void> {
    if (reposterId === originalAuthorId) return;

    try {
      const reposterProfile = (await this.profileService.getProfile(
        reposterId,
      )) as Profile;
      if (!reposterProfile) return;

      const notificationType = 'REPOST';
      const notificationBody = {
        reposter: {
          user_id: reposterProfile.user_id,
          displayName: reposterProfile.nickname,
          avatarUrl: reposterProfile.avatar,
        },
        originalPost: { id: originalPostId },
        newPost: { id: newPostId },
        message: `${reposterProfile.nickname || `User ${reposterId}`} reposted your post.`,
        createdAt: new Date().toISOString(),
      };

      await this.notificationService.createNotification(
        originalAuthorId,
        notificationType,
        notificationBody,
      );
    } catch (error) {
      // TODO: implement retry mechanism
    }
  }

  private async enrichPostWithMediaUrls(
    post: Post | null,
  ): Promise<Post | null> {
    if (!post) {
      return null;
    }

    const enrichedPost: Post = JSON.parse(JSON.stringify(post));

    const enrichmentPromises: Promise<void>[] = [];
    const expirySeconds = 1 * 60 * 60;

    const addUrlPromise = (
      objectPath: string | null | undefined,
      updateFn: (url: string | null) => void,
    ) => {
      if (objectPath) {
        if (objectPath.includes('https://lh3.googleusercontent.com')) {
          updateFn(objectPath);
        } else {
          enrichmentPromises.push(
            this.minioClientService
              .generatePresignedDownloadUrl(objectPath, expirySeconds)
              .then((url) => {
                updateFn(url);
              })
              .catch((error) => {
                updateFn(null);
              }),
          );
        }
      } else {
        updateFn(null);
      }
    };

    addUrlPromise(post.image, (url) => {
      enrichedPost.image = url;
    });
    addUrlPromise(post.video, (url) => {
      enrichedPost.video = url;
    });
    addUrlPromise(post.video_thumbnail, (url) => {
      enrichedPost.video_thumbnail = url;
    });

    if (post.user) {
      addUrlPromise(post.user.avatar, (url) => {
        if (enrichedPost.user) enrichedPost.user.avatar = url;
      });
      addUrlPromise(post.user.background, (url) => {
        if (enrichedPost.user) enrichedPost.user.background = url;
      });
    } else {
      if (enrichedPost.user) {
        enrichedPost.user.avatar = null;
        enrichedPost.user.background = null;
      }
    }

    if (post.repostOrigin && enrichedPost.repostOrigin) {
      const origin = post.repostOrigin;
      const enrichedOrigin = enrichedPost.repostOrigin;

      addUrlPromise(origin.image, (url) => {
        enrichedOrigin.image = url;
      });
      addUrlPromise(origin.video, (url) => {
        enrichedOrigin.video = url;
      });
      addUrlPromise(origin.video_thumbnail, (url) => {
        enrichedOrigin.video_thumbnail = url;
      });

      if (origin.user && enrichedOrigin.user) {
        addUrlPromise(origin.user.avatar, (url) => {
          enrichedOrigin.user.avatar = url;
        });
        addUrlPromise(origin.user.background, (url) => {
          enrichedOrigin.user.background = url;
        });
      } else {
        if (enrichedOrigin.user) {
          enrichedOrigin.user.avatar = null;
          enrichedOrigin.user.background = null;
        }
      }
    } else {
      enrichedPost.repostOrigin = null;
    }

    const results = await Promise.allSettled(enrichmentPromises);
    return enrichedPost;
  }
}
