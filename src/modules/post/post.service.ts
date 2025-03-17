import { Injectable } from '@nestjs/common';
import { PostUtil } from 'src/modules/post/post.util';
import { PostDto } from './dto/post.dto';
import { PostFilterDto } from './dto/postFilter.dto';

@Injectable()
export class PostService {
  constructor(private readonly postUtil: PostUtil) {}

  async getAllPosts() {
    return this.postUtil.getAllPosts();
  }

  async getPostsWithFilters(postFilterDto: PostFilterDto) {
    return this.postUtil.getPostsWithFilters(postFilterDto);
  }

  async findPostById(post_id: number, user_id: number) {
    return this.postUtil.getPostById(post_id, user_id);
  }

  async createPost(data: PostDto, user_id: number) {
    const { repost_id } = data;

    if (repost_id) {
      const post = await this.postUtil.getPostById(repost_id, user_id);
      if (!post) return null;
    }

    return this.postUtil.createPost(data, user_id);
  }

  async updatePost(post_id: number, data: PostDto, user_id: number) {
    const post = await this.postUtil.getPostById(post_id, user_id);

    if (post) return this.postUtil.updatePost(post_id, data);

    return null;
  }

  async deletePost(post_id: number, user_id: number) {
    const post = await this.postUtil.getPostById(post_id, user_id);

    if (post) return this.postUtil.deletePost(post_id);

    return null;
  }
}
