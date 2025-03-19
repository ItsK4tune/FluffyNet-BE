import { Injectable } from '@nestjs/common';
import { PostUtil } from 'src/modules/post/post.util';
import { PostDto } from './dto/post.dto';
import { Post } from './entities/post.entity';
import { MinioClientService } from '../minio-client/minio-client.service';
import { MinioEnum } from 'src/utils/enums/enum';
import { FollowService } from '../follow/follow.service';

@Injectable()
export class PostService {
  constructor(
    private readonly postUtil: PostUtil,
    private readonly minioClientService: MinioClientService,
    private readonly followService: FollowService,
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

    const postData: Partial<PostDto> & { image?: string; video?: string } = {
      ...data,
      image: savedImage,
      video: savedVideo,
    };

    await this.postUtil.createPost(user_id, postData);
    return true;
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
}
