import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { In, IsNull, Repository, UpdateResult } from 'typeorm';
import { Like } from '../like/entity/like.entity';

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
    @InjectRepository(Like) private readonly likeRepo: Repository<Like>,
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

  async deleteComment(comment_id: number, post_id: number): Promise<number> {
    const status = await this.repo.delete({ comment_id: comment_id });
    if (status.affected === 0) {
      return -1;
    }
    const remainingComments = await this.repo.count({
      where: { post_id },
    });
    return remainingComments;
  }

  async getCommentsByPostIdWithRelations(
    user_id: number,
    post_id: number,
  ): Promise<Comment[]> {
    const comments = await this.repo.find({
      where: { post_id },
      order: { created_at: 'ASC' },
      relations: ['profile'],
      select: {
        comment_id: true,
        user_id: true,
        post_id: true,
        parent_id: true,
        body: true,
        image: true,
        video: true,
        video_thumbnail: true,
        video_status: true,
        created_at: true,
        updated_at: true,
        profile: {
          nickname: true,
          avatar: true,
          user: {
            is_banned: true,
            is_suspended: true,
            is_verified: true,
          },
        },
      },
    });

    const commentIds = comments.map((comment) => comment.comment_id);

    const likedPosts = await this.likeRepo.find({
      where: {
        user_id: user_id,
        comment_id: In(commentIds),
      },
      select: ['comment_id'],
    });

    const likedCommentIds = new Set(likedPosts.map((lp) => lp.comment_id));

    return comments.map((comment) => ({
      ...comment,
      liked: likedCommentIds.has(comment.comment_id),
    }));
  }
}
