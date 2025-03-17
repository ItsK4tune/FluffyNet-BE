import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/modules/post/entities/post.entity';
import { Repository } from 'typeorm';
import { PostDto } from './dto/post.dto';

@Injectable()
export class PostUtil {
  constructor(
    @InjectRepository(Post) private readonly repo: Repository<Post>,
  ) {}

  async getAllPosts() {
    return await this.repo.find();
  }

  async getPostById(post_id: number) {
    return await this.repo.findOne({ where: { post_id } });
  }

  async createPost(user_id: number, data: PostDto) {
    const newPost = this.repo.create({...data, user_id});
    return await this.repo.save(newPost);
  }

  async updatePost(post_id: number, data: PostDto) {
    return await this.repo.update(post_id, data);
  }

  async deletePost(post_id: number) {
    return await this.repo.delete(post_id);
  }
}
