import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/modules/post/entities/post.entity';
import { In, Repository } from 'typeorm';
import { PostDto } from './dto/post.dto';
import { MinioClientService } from '../minio-client/minio-client.service';

@Injectable()
export class PostUtil {
  constructor(
    @InjectRepository(Post) private readonly repo: Repository<Post>,
    private readonly minioClientService: MinioClientService,
  ) {}

  async getAllPosts() {
    const list = await this.repo.find();

    for (const post of list) {
      if (post.image)
        post.image = this.minioClientService.getFileUrl(post.image);
      if (post.video)
        post.video = this.minioClientService.getFileUrl(post.video);
    }

    return list;
  }

  async getPostsOfFollowing(user_ids: number[]): Promise<Post[]> {
    const list = await this.repo.find({ where: { user_id: In(user_ids) } });

    for (const post of list) {
      if (post.image)
        post.image = this.minioClientService.getFileUrl(post.image);
      if (post.video)
        post.video = this.minioClientService.getFileUrl(post.video);
    }

    return list;
  }

  async getPostById(post_id: number) {
    const post = await this.repo.findOne({ where: { post_id } });
    
    if (!post) {
        return null;
    }

    if (post.image)
        post.image = this.minioClientService.getFileUrl(post.image);
    if (post.video)
        post.video = this.minioClientService.getFileUrl(post.video);

    return post;
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
