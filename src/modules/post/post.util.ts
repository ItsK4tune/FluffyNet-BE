import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/modules/post/entities/post.entity';
import { FindOptionsOrderValue, In, Repository } from 'typeorm';
import { Like } from '../like/entity/like.entity';

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
    @InjectRepository(Like) private readonly likeRepo: Repository<Like>,
  ) {}

  async getAllPosts(user_id: number, options?: { skip?: number; take?: number; order?: string}): Promise<Post[]> {
    const posts = await this.repo.find({
      order: { created_at: options?.order as FindOptionsOrderValue }, 
      skip: options?.skip,
      take: options?.take,
      relations: [
        'user',
        'user.profile',
        'repostOrigin',
        'repostOrigin.user',
        'repostOrigin.user.profile',
      ],
      select: {
        post_id: true,
        user_id: true, 
        body: true,
        image: true,
        video: true,
        repost_id: true, 
        created_at: true,
        updated_at: true,
        user: { 
          user_id: true, 
          profile: { user_id: true, name: true, avatar: true }, 
        },
        is_repost_deleted: true,
        repostOrigin: {
          post_id: true,
          user_id: true,
          body: true,
          image: true,
          video: true,
          repost_id: true,
          created_at: true,
          updated_at: true,
          user: {
            user_id: true,
            profile: { user_id: true, name: true, avatar: true },
          }
        }
      }
    });

    const postIds = posts.map(post => post.post_id);

    const likedPosts = await this.likeRepo.find({
      where: {
        user_id: user_id,
        post_id: In(postIds),
      },
      select: ['post_id'],
    });

    const likedPostIds = new Set(likedPosts.map(lp => lp.post_id));

    return posts.map(post => ({
      ...post,
      liked: likedPostIds.has(post.post_id),
    }));
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
      select: {
        post_id: true,
        user_id: true, 
        body: true,
        image: true,
        video: true,
        repost_id: true, 
        created_at: true,
        updated_at: true,
        user: { 
          user_id: true, 
          profile: { user_id: true, name: true, avatar: true }, 
        },
        is_repost_deleted: true,
        repostOrigin: {
          post_id: true,
          user_id: true,
          body: true,
          image: true,
          video: true,
          repost_id: true,
          created_at: true,
          updated_at: true,
          user: {
            user_id: true,
            profile: { user_id: true, name: true, avatar: true },
          }
        }
      }
    });
  }

  async getPostById(post_id: number, relations?: string[]): Promise<Post | null> {
    return this.repo.findOne({
      where: { post_id },
      relations: relations || ['user', 'user.profile', 'repostOrigin', 'repostOrigin.user', 'repostOrigin.user.profile'],
    });
  }

  async getPostsByRepostId(repost_id: number): Promise<Post[] | null> {
    return this.repo.find({
      where: { repost_id },
    });
  }

  async getPostsOfFollowing(user_ids: number[], user_id: number, options?: { skip?: number; take?: number; order?: string }): Promise<Post[]> {
    const posts = await this.repo.find({
      where: { user_id: In(user_ids) },
      order: { created_at: options?.order as FindOptionsOrderValue }, 
      skip: options?.skip,
      take: options?.take,
      relations: [
        'user',
        'user.profile',
        'repostOrigin',
        'repostOrigin.user',
        'repostOrigin.user.profile',
      ],
      select: {
        post_id: true,
        user_id: true, 
        body: true,
        image: true,
        video: true,
        repost_id: true, 
        created_at: true,
        updated_at: true,
        user: { 
          user_id: true, 
          profile: { user_id: true, name: true, avatar: true }, 
        },
        is_repost_deleted: true,
        repostOrigin: {
          post_id: true,
          user_id: true,
          body: true,
          image: true,
          video: true,
          repost_id: true,
          created_at: true,
          updated_at: true,
          user: {
            user_id: true,
            profile: { user_id: true, name: true, avatar: true },
          }
        }
      }
    });

    const postIds = posts.map(post => post.post_id);

    const likedPosts = await this.likeRepo.find({
      where: {
        user_id: user_id,
        post_id: In(postIds),
      },
      select: ['post_id'],
    });

    const likedPostIds = new Set(likedPosts.map(lp => lp.post_id));

    return posts.map(post => ({
      ...post,
      liked: likedPostIds.has(post.post_id),
    }));
  }

  async createPost(user_id: number, data: CreatePostData): Promise<Post> {
    const newPost = this.repo.create({
      ...data,
      user_id: user_id,
      ...(data.repost_id ? { repostOrigin: { post_id: data.repost_id } } : {})
    });
    const savedPost = await this.repo.save(newPost);

    return await this.repo.findOne({
      where: { post_id: savedPost.post_id },
      relations: [
        'user',
        'user.profile',
        'repostOrigin',
        'repostOrigin.user',
        'repostOrigin.user.profile',
      ],
      select: {
        post_id: true,
        user_id: true, 
        body: true,
        image: true,
        video: true,
        repost_id: true, 
        created_at: true,
        updated_at: true,
        user: { 
          user_id: true, 
          profile: { user_id: true, name: true, avatar: true }, 
        },
        is_repost_deleted: true,
        repostOrigin: {
          post_id: true,
          user_id: true,
          body: true,
          image: true,
          video: true,
          repost_id: true,
          created_at: true,
          updated_at: true,
          user: {
            user_id: true,
            profile: { user_id: true, name: true, avatar: true },
          }
        }
      }
    });
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

  async save(post: Post) {
    try {
      await this.repo.save(post);
    } catch (err) {
      throw err;
    }
  }
}
