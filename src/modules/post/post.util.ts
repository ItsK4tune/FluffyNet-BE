import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/modules/post/entities/post.entity';
import { Repository } from 'typeorm';
import { PostDto } from './dto/post.dto';
import { PostFilterDto } from './dto/postFilter.dto';

@Injectable()
export class PostUtil {
  constructor(
    @InjectRepository(Post) private readonly repo: Repository<Post>,
  ) {}

  async getAllPosts() {
    return await this.repo.find();
  }

  async getPostsWithFilters(postFilterDto: PostFilterDto) {
    const { body, image, video, user_id } = postFilterDto;

    const query = this.repo.createQueryBuilder('post');

    if (body) {
      query.andWhere('LOWER(post.body) LIKE LOWER(:body)', {
        body: `%${body}%`,
      });
    }

    if (image) {
      query.andWhere('LOWER(post.image) LIKE LOWER(:image)', {
        image: `%${image}%`,
      });
    }

    if (video) {
      query.andWhere('LOWER(post.video) LIKE LOWER(:video)', {
        video: `%${video}%`,
      });
    }

    if (user_id) {
      query.andWhere('post.user_id = :user_id', { user_id: user_id });
    }
    return await query.getMany();
  }

  async getPostById(post_id: number, user_id: number) {
    return await this.repo.findOne({ where: { post_id, user_id } });
  }

  async createPost(data: PostDto, user_id: number) {
    const newPost = this.repo.create({ ...data, user_id });
    return await this.repo.save(newPost);
  }

  async updatePost(post_id: number, data: PostDto) {
    return await this.repo.update(post_id, data);
  }

  async deletePost(post_id: number) {
    return await this.repo.delete(post_id);
  }
}
