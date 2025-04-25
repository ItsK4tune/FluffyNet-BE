import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { In, IsNull, Repository, UpdateResult } from 'typeorm';

interface CreateCommentData {
  body?: string;
  image?: string | null;
  video?: string | null;
  parent_id?: number | null;
}

interface UpdateCommentData {
  body?: string;
}

@Injectable()
export class CommentUtil {
  constructor(
    @InjectRepository(Comment) private readonly repo: Repository<Comment>,
  ) {}

  async getRootCommentsByPost(
    post_id: number,
    relations: string[] = ['user', 'user.profile', 'likes'],
  ): Promise<Comment[]> {
    return this.repo.find({
      where: { post_id, parent_id: IsNull() },
      order: { created_at: 'ASC' },
      relations: relations,
    });
  }

  async getRepliesForComments(
    parent_ids: number[],
    relations: string[] = ['user', 'user.profile', 'likes'],
  ): Promise<Comment[]> {
    if (!parent_ids || parent_ids.length === 0) {
      return [];
    }
    return this.repo.find({
      where: { parent_id: In(parent_ids) },
      order: { created_at: 'ASC' },
      relations: relations,
    });
  }

  async getCommentById(comment_id: number): Promise<Comment | null> {
    return this.repo.findOne({
      where: { comment_id },
      relations: ['profile', 'parentComment'],
    });
  }

  async getCommentByPost(post_id: number) {
    return await this.repo.find({
      where: { post_id },
      order: { created_at: 'DESC' },
    });
  }

  async createComment(
    post_id: number,
    user_id: number,
    data: CreateCommentData,
  ): Promise<Comment> {
    const newComment = this.repo.create({
      body: data.body,
      image: null,
      video: null,
      post_id,
      user_id,
      ...(data.parent_id
        ? { parentComment: { comment_id: data.parent_id } }
        : {}),
    });
    return this.repo.save(newComment);
  }

  async updateCommentBody(
    comment_id: number,
    data: UpdateCommentData,
  ): Promise<boolean> {
    const result = await this.repo.update({ comment_id }, { body: data.body });
    return result.affected > 0;
  }

  async updateCommentImage(
    commentId: number,
    imageObjectName: string | null,
  ): Promise<boolean> {
    const result = await this.repo.update(
      { comment_id: commentId },
      { image: imageObjectName },
    );
    return result.affected > 0;
  }

  async updateCommentVideo(
    comment_id: number,
    videoObjectName: string | null,
    thumbnailObjectName: string | null,
  ): Promise<boolean> {
    const updateData: Partial<Comment> = {
      video: videoObjectName,
      video_thumbnail: thumbnailObjectName,
    };

    const result: UpdateResult = await this.repo
      .createQueryBuilder()
      .update(Comment)
      .set(updateData)
      .where('comment_id = :commentId', { commentId: comment_id })
      .execute();

    return result.affected > 0;
  }

  async updateStatus(comment_id: number, status: string): Promise<boolean> {
    try {
      const result: UpdateResult = await this.repo
        .createQueryBuilder()
        .update(Comment)
        .set({ video_status: status })
        .where('comment_id = :commentId', { commentId: comment_id })
        .execute();
      return result.affected > 0;
    } catch (error) {
      throw new Error(
        `Could not update video status for comment ${comment_id}`,
      );
    }
  }

  async saveComment(comment: Comment) {
    return await this.repo.save(comment);
  }

  async deleteComment(commentId: number): Promise<boolean> {
    const result = await this.repo.delete({ comment_id: commentId });
    return result.affected > 0;
  }

  async getCommentsByPostIdWithRelations(post_id: number): Promise<Comment[]> {
    return this.repo.find({
      where: { post_id },
      order: { created_at: 'ASC' },
      relations: ['profile'],
    });
  }
}
