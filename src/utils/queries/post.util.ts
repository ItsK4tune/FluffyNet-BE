import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/modules/posts/entities/post.entity';
import { DeleteResult, Repository } from 'typeorm';

@Injectable()
export class PostUil {
  constructor(
    @InjectRepository(Post)
    private readonly repo: Repository<Post>,
  ) {}

  async getAllPosts(): Promise<Post[]> {
    return await this.repo.find();
  }

  async getPostById(post_id: number): Promise<Post> {
    return await this.repo.findOne({ where: { post_id } });
  }

  async createPost(data: Partial<Post>): Promise<Post> {
    const newPost = this.repo.create(data);
    return await this.repo.save(newPost);
  }

  async updatePost(post_id: number, data: Partial<Post>): Promise<Post> {
    await this.repo.update(post_id, data);
    return this.getPostById(post_id);
  }

  async deletePost(post_id: number): Promise<DeleteResult> {
    return await this.repo.delete(post_id);
  }
}
