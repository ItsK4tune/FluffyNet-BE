import { Injectable } from '@nestjs/common';
import { PostUtil } from 'src/modules/post/post.util';
import { PostDto } from './dto/post.dto';

@Injectable()
export class PostService {
  constructor(
    private readonly postUtil: PostUtil,
  ) {}

  async getAllPosts() {
    return this.postUtil.getAllPosts();
  }

  async findOneById(post_id: number) {
    return this.postUtil.getPostById(post_id);
  }

  async createPost(data: PostDto) {
    const { repost_id } = data;
    const post = await this.postUtil.getPostById(repost_id);

    if (post)
      return this.postUtil.createPost(data);

    return null;
  }

  async updatePost(post_id: number, data: PostDto) {
    const post = await this.postUtil.getPostById(post_id);

    if (post)
      return this.postUtil.updatePost(post_id, data);

    return null;
  }

  async deletePost(post_id: number) {
    return this.postUtil.deletePost(post_id);
  }
}
