import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LikeService } from './like.service';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('like')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('user', 'admin')
@ApiBearerAuth()
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @ApiOperation({
    summary: 'Get like status',
    description: 'Check wether user like post or not',
  })
  @ApiResponse({ status: 201, description: 'true' })
  @ApiResponse({ status: 201, description: 'false' })
  @Post('post-status')
  async getPostLikeStatus(@Req() req, @Body('post_id') post_id: number) {
    const user_id = req.user.user_id;
    const status = await this.likeService.getPostLikeStatus(user_id, post_id);
    return { status: status };
  }

  @ApiOperation({
    summary: 'Get like status',
    description: 'Check wether user like comment or not',
  })
  @ApiResponse({ status: 201, description: 'true' })
  @ApiResponse({ status: 201, description: 'false' })
  @Post('comment-status')
  async getCommentLikeStatus(
    @Req() req,
    @Body('comment_id') comment_id: number,
  ) {
    const user_id = req.user.user.id;
    const status = await this.likeService.getCommentLikeStatus(
      user_id,
      comment_id,
    );
    return { status: status };
  }

  @ApiOperation({
    summary: 'Get total like',
    description: 'Total of like in this post',
  })
  @ApiResponse({ status: 201, description: 'total' })
  @ApiResponse({ status: 400, description: 'Post not exist' })
  @Post('total-like')
  async getPostLikeCount(@Body('post_id') post_id: number) {
    const result = await this.likeService.getPostLikeCount(post_id);

    if (result === 'No') throw new BadRequestException('Post not exist');
    return { total: result };
  }

  @ApiOperation({
    summary: 'Get total like',
    description: 'Total of like in this comment',
  })
  @ApiResponse({ status: 201, description: 'total' })
  @ApiResponse({ status: 400, description: 'Comment not exist' })
  @Post('total-like')
  async getCommentLikeCount(@Body('comment_id') comment_id: number) {
    const result = await this.likeService.getCommentLikeCount(comment_id);

    if (result === 'No') throw new BadRequestException('Comment not exist');
    return { total: result };
  }

  @ApiOperation({
    summary: 'User like post',
    description: 'Authen, author and like',
  })
  @ApiResponse({ status: 201, description: 'true' })
  @ApiResponse({ status: 201, description: 'false' })
  @Post('like-post')
  async LikePost(@Req() req, @Body('post_id') post_id: number) {
    const user_id = req.user.user_id;
    const status = await this.likeService.likePost(user_id, post_id);
    return status;
  }

  @ApiOperation({
    summary: 'User like post',
    description: 'Authen, author and like',
  })
  @ApiResponse({ status: 201, description: 'true' })
  @ApiResponse({ status: 201, description: 'false' })
  @Post('like-comment')
  async LikeComment(
    @Req() req,
    @Body('post_id') post_id: number,
    @Body('comment_id') comment_id: number,
  ) {
    const user_id = req.user.user_id;
    const status = await this.likeService.likeComment(
      user_id,
      post_id,
      comment_id,
    );
    return { status: status };
  }
}
