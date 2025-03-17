import { Injectable } from '@nestjs/common';
import { PostUtil } from 'src/modules/post/post.util';
import { PostDto } from './dto/post.dto';
import { Post } from './entities/post.entity';
import { MinioClientService } from '../minio-client/minio-client.service';
import { MinioEnum } from 'src/utils/enums/enum';

@Injectable()
export class PostService {
  constructor(
    private readonly postUtil: PostUtil,
    private readonly minioClientService: MinioClientService,
  ) {}

  async getAllPosts(): Promise<Post[]> {
    return this.postUtil.getAllPosts();
  }

  async findOneById(post_id: number): Promise<Post> {
    return this.postUtil.getPostById(post_id);
  }

  async createPost(user_id: number, data: PostDto, files: { image?: any, video?: any }): Promise<Boolean> {
    const { repost_id } = data;
    
    if (repost_id) {
      const repost = await this.postUtil.getPostById(repost_id);
      if (!repost)
        return null;
    }

    if (files?.image?.[0]) {
      const uploadedAvatar = await this.minioClientService.upload(files.image[0], MinioEnum.image);
      var savedImage = uploadedAvatar;
    }
    if (files?.video?.[0]) {
      const uploadedBackground = await this.minioClientService.upload(files.video[0], MinioEnum.video);
      var savedVideo = uploadedBackground;
    }

    const postData: Partial<PostDto> & { savedImage?: string; savedVideo?: string } = {
      ...data,
      savedImage,
      savedVideo,
    };

    await this.postUtil.createPost(user_id, postData);
    return true;
  }

  async updatePost(user_id: number, post_id: number, data: PostDto, files: { image?: any, video?: any }) {
    const post = await this.postUtil.getPostById(post_id);

    if (!post)  return null;
    if (post.user_id !== user_id) return false;

    if (files?.image?.[0]) {
      const uploadedAvatar = await this.minioClientService.upload(files.image[0], MinioEnum.image);
      var savedImage = uploadedAvatar;
    }
    if (files?.video?.[0]) {
      const uploadedBackground = await this.minioClientService.upload(files.video[0], MinioEnum.video);
      var savedVideo = uploadedBackground;
    }

    const patchData: Partial<PostDto> & { savedImage?: string; savedVideo?: string } = {
      ...data,
      savedImage,
      savedVideo,
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
