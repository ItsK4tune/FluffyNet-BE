import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { Repository } from 'typeorm';
import { CommentDto } from './dtos/comment.dto';
import { MinioClientService } from '../minio-client/minio-client.service';
import { MinioEnum } from 'src/utils/enums/enum';

@Injectable()
export class CommentUtil {
  constructor(
    @InjectRepository(Comment) private readonly repo: Repository<Comment>,
    private readonly minioClientService: MinioClientService,
  ) {}

  async getCommentByPost(post_id: number) {
    return await this.repo.find({
      where: { post_id },
      order: { createdAt: 'DESC' },
    });
  }

  async getCommentById(comment_id: number) {
    return await this.repo.findOne({
      where: { comment_id },
      order: { createdAt: 'DESC' },
    });
  }

  async createComment(
    post_id: number,
    user_id: number,
    commentDto: CommentDto,
    files,
  ) {
    let savedImage: string | null = null;
    let savedVideo: string | null = null;

    if (files?.image?.[0]) {
      const uploadedAvatar = await this.minioClientService.upload(
        files.image[0],
        MinioEnum.image,
      );
      savedImage = uploadedAvatar;
    }
    if (files?.video?.[0]) {
      const uploadedBackground = await this.minioClientService.upload(
        files.video[0],
        MinioEnum.video,
      );
      savedVideo = uploadedBackground;
    }

    const comment: Partial<CommentDto> & { image?: string; video?: string } = {
      ...commentDto,
      image: savedImage,
      video: savedVideo,
    };

    const create = this.repo.create({
      ...comment,
      post_id,
      user_id,
    });

    return await this.saveComment(create);
  }

  async saveComment(comment: Comment) {
    return await this.repo.save(comment);
  }

  async deleteComment(comment_id: number) {
    return await this.repo.delete({ comment_id });
  }
}
