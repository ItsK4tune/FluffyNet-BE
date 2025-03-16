import { Injectable } from '@nestjs/common';
import { PostUtil } from 'src/modules/post/post.util';
import { PostDto } from './dto/post.dto';
import { Post } from './entities/post.entity';

@Injectable()
export class PostService {
  constructor(
    private readonly postUtil: PostUtil,
  ) {}

  async getAllPosts(): Promise<Post[]> {
    return this.postUtil.getAllPosts();
  }

  async findOneById(post_id: number): Promise<Post> {
    return this.postUtil.getPostById(post_id);
  }

  async createPost(user_id: number, data: PostDto): Promise<Boolean> {
    const { repost_id } = data;
    
    if (repost_id) {
      const repost = await this.postUtil.getPostById(repost_id);
      if (!repost)
        return null;
    }

    await this.postUtil.createPost(user_id, data);
    return true;
  }

  async updatePost(user_id: number, post_id: number, data: PostDto) {
    const post = await this.postUtil.getPostById(post_id);

    if (!post)  return null;
    if (post.user_id !== user_id) return false;

    return this.postUtil.updatePost(post_id, data);
  }

  async deletePost(user_id: number, post_id: number) {
    const post = await this.postUtil.getPostById(post_id);

    if (!post)  return null;
    if (post.user_id !== user_id) return false;
    
    return this.postUtil.deletePost(post_id);
  }
}
