import { Injectable } from '@nestjs/common';
import { PostUil } from 'src/utils/queries/post.util';
import { Post } from './entities/post.entity';

@Injectable()
export class PostsService {
  constructor(private readonly postUtil: PostUil) {}

  async getAllPosts() {
    return this.postUtil.getAllPosts();
  }

  async findOneById(post_id: number) {
    return this.postUtil.getPostById(post_id);
  }

  async createPost(data: Partial<Post>) {
    return this.postUtil.createPost(data);
  }

  async updatePost(post_id: number, data: Partial<Post>) {
    return this.postUtil.updatePost(post_id, data);
  }

  async deletePost(post_id: number) {
    return this.postUtil.deletePost(post_id);
  }
}
