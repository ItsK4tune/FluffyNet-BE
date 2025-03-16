// import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Comment } from './entities/comment.entity';
// import { CreateCommentDto, UpdateCommentDto } from './dtos/create-comment.dto';
// import { InjectRedis } from '@nestjs-modules/ioredis';
// import Redis from 'ioredis';
// import { RedisEnum } from 'src/utils/enums/redis.enum';
// import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
// import { env } from 'src/config';
// import { PostUtil } from '../post/post.util';
// import { CommentUtil } from './comment.util';

// @Injectable()
// export class CommentService {
//   constructor(
//     @InjectRedis() private readonly redis: Redis,
//     private readonly postUtil: PostUtil,
//     private readonly commentUtil: CommentUtil
//   ) {}

//   async getCommentsByPost(post_id: number): Promise<Comment[]> {
//     const post = await this.postUtil.getPostById(post_id);

//     if (!post) return null;

//     const key = `${RedisEnum.comment}:${post_id}`;
//     const cache = await this.redis.get(key);
//     if (cache) return JSON.parse(cache);

//     const comments = await this.commentUtil.getComment(post_id);

//     await this.redis.set(key, JSON.stringify(comments), 'EX', convertToSeconds(env.redis.ttl));
//     return comments;
//   }

//   async getCommentById(comment_id: string): Promise<Comment> {
//     const key = `${RedisEnum.comment}:${comment_id}`;
//     const cache = await this.redis.get(key);
//     if (cache) return JSON.parse(cache);

//     const comment = await this.commentRepository.findOne({ where: { comment_id } });
//     if (!comment) throw new NotFoundException('Comment not found');

//     await this.redis.set(key, JSON.stringify(comment), 'EX', convertToSeconds(env.redis.ttl));
//     return comment;
//   }

//   async createComment(user_id: string, createCommentDto: CreateCommentDto) {
//     const comment = this.commentRepository.create({
//         ...createCommentDto,
//         user_id: user_id
//     });
//     return this.commentRepository.save(comment);
// }


//   async updateComment(user_id: string, comment_id: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
//     const comment = await this.getCommentById(comment_id);
//     if (!comment) throw new NotFoundException('Comment not found');
//     if (comment.user_id !== user_id) throw new ForbiddenException('Not allowed');

//     Object.assign(comment, updateCommentDto);
//     await this.commentRepository.save(comment);
//     await this.redis.del(`${RedisEnum.comment}:${comment_id}`);
//     return comment;
//   }

//   async deleteComment(user_id: string, comment_id: string): Promise<{ message: string }> {
//     const comment = await this.getCommentById(comment_id);
//     if (!comment) throw new NotFoundException('Comment not found');
//     if (comment.user_id !== user_id) throw new ForbiddenException('Not allowed');

//     await this.commentRepository.delete(comment_id);
//     await this.redis.del(`${RedisEnum.comment}:${comment_id}`);
//     await this.redis.del(`${RedisEnum.comment}:${comment.post_id}`);
//     return { message: 'Comment deleted' };
//   }
// }
