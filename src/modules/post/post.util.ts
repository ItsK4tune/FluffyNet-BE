import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/modules/post/entities/post.entity';
import { In, Repository } from 'typeorm';

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
export class PostUtil {
  constructor(
    @InjectRepository(Post) private readonly repo: Repository<Post>,
  ) {}

  async getAllPosts(options?: { skip?: number; take?: number; relations?: string[] }): Promise<Post[]> {
    return this.repo.find({
      order: { created_at: 'DESC' }, 
      skip: options?.skip,
      take: options?.take,
      relations: options?.relations || [
        'user',
        'user.profile',
        'repostOrigin',
        'repostOrigin.user',
        'repostOrigin.user.profile',
      ],
    });
  }

  async getPostsByUserIds(user_ids: number[], options?: { skip?: number; take?: number; relations?: string[] }): Promise<Post[]> {
    if (!user_ids || user_ids.length === 0) {
      return [];
    }
    return this.repo.find({
      where: { user_id: In(user_ids) },
      order: { created_at: 'DESC' },
      skip: options?.skip,
      take: options?.take,
      relations: options?.relations || [
        'user',
        'user.profile',
        'repostOrigin',
        'repostOrigin.user',
        'repostOrigin.user.profile',
        'likes',
      ],
    });
  }

  async getPostById(post_id: number, relations?: string[]): Promise<Post | null> {
    return this.repo.findOne({
      where: { post_id },
      relations: relations || ['user', 'user.profile', 'repostOrigin', 'repostOrigin.user', 'repostOrigin.user.profile'],
    });
  }

  async getPostsOfFollowing(user_ids: number[], options?: { skip?: number; take?: number; relations?: string[] }): Promise<Post[]> {
    return this.repo.find({ 
      where: { user_id: In(user_ids) },
      order: { created_at: 'DESC' },
      skip: options?.skip,
      take: options?.take,
      relations: options?.relations || ['user', 'user.profile', 'repostOrigin', 'repostOrigin.user', 'repostOrigin.user.profile', 'likes'], 
    });
  }

  async createPost(user_id: number, data: CreatePostData): Promise<Post> {
    let repostOrigin = null;

    if (data.repost_id) {
      repostOrigin = await this.repo.findOne({
        where: { post_id: data.repost_id },
      });
    }

    const newPost = this.repo.create({
        ...data,
        user_id: user_id,
        repostOrigin: repostOrigin,
    });

    return this.repo.save(newPost);
 }

  async updatePost(post_id: number, data: UpdatePostData): Promise<boolean> {
    const updateData: Partial<Post> = {};
    if (data.body !== undefined) {
      updateData.body = data.body;
    }

    if (Object.keys(updateData).length === 0) {
      return true;
    }

    const result = await this.repo.update({ post_id }, updateData);
    return result.affected > 0; 
  }

  async deletePost(post_id: number): Promise<boolean> {
    const result = await this.repo.delete({ post_id });
    return result.affected > 0;
  }

  async updatePostImage(post_id: number, imageObjectName: string | null): Promise<boolean> {
    const result = await this.repo.update({ post_id }, { image: imageObjectName });
    return result.affected > 0;
  }

  async updatePostVideo(post_id: number, videoObjectName: string | null): Promise<boolean> {
    const result = await this.repo.update({ post_id }, { video: videoObjectName });
    return result.affected > 0;
  }
}
