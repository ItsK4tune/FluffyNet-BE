import {
  Controller,
  Get,
  Post as HttpPost,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  InternalServerErrorException,
  BadRequestException,
  Res,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentDto } from './dtos/comment.dto';
import {
  CommentUploadCompleteDto,
  CommentUploadPresignDto,
} from './dtos/comment-upload.dto';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import {
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Comment as CommentEntity } from './entities/comment.entity';
import { MinioClientService } from '../minio-client/minio-client.service';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';
import { QueueService } from '../minio-client/queue.service';

@ApiTags('Comment')
@Controller('comment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly minioClientService: MinioClientService,
    private readonly queue: QueueService,
  ) {}

  @ApiOperation({
    summary: `Get all comments for a specific post (structured as a tree)`,
  })
  @ApiParam({
    name: 'post_id',
    description: 'ID of the post to get comments for',
  })
  @ApiResponse({
    status: 200,
    description: 'List of comments with replies nested',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found ( implicitly handled if no comments )',
  })
  @Get('/post/:post_id')
  async getCommentsByPost(
    @Param('post_id', ParseIntPipe) post_id: number,
  ): Promise<{ comments: any[] }> {
    const commentTree = await this.commentService.getCommentsByPost(post_id);
    return { comments: commentTree };
  }

  @ApiOperation({ summary: `Create a new comment or reply on a post` })
  @ApiParam({ name: 'post_id', description: 'ID of the post to comment on' })
  @ApiBody({
    type: CommentDto,
    description: 'Comment content (body) and optional parent_id for replies.',
  })
  @ApiResponse({ status: 201, description: 'Comment created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (missing body, invalid parent_id, etc.).',
  })
  @ApiResponse({
    status: 404,
    description: 'Post or Parent Comment not found.',
  })
  @HttpPost('/post/:post_id')
  async createComment(
    @Param('post_id', ParseIntPipe) post_id: number,
    @Request() req,
    @Body() commentDto: CommentDto,
  ): Promise<{ message: string; comment: CommentEntity }> {
    const userId = req.user.user_id;
    try {
      const newComment = await this.commentService.createComment(
        post_id,
        userId,
        commentDto,
      );
      return {
        message:
          'Comment created successfully. Attach files separately if needed.',
        comment: newComment,
      };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Get presigned URL for uploading comment image/video',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated.',
    schema: {
      type: 'object',
      properties: {
        presignedUrl: { type: 'string' },
        objectName: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (filename, contentType).',
  })
  @HttpPost('generate-upload-url')
  async getPresignedUploadUrl(
    @Request() req,
    @Body() uploadPresignDto: CommentUploadPresignDto,
    @Query('post_id', ParseIntPipe) post_id: number,
  ): Promise<{ presignedUrl: string; objectName: string }> {
    const { filename, contentType } = uploadPresignDto;
    const userId = req.user.user_id;

    const fileTypeFolder = contentType.startsWith('image/')
      ? 'images'
      : 'videos';
    const prefix = `comments/post_${post_id}/user_${userId}/${fileTypeFolder}/`;

    try {
      const result = await this.minioClientService.generatePresignedUploadUrl(
        filename,
        contentType,
        prefix,
        convertToSeconds(env.minio.time),
      );
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        'Could not generate comment upload URL.',
      );
    }
  }

  @ApiOperation({ summary: 'Attach an image or video to an existing comment' })
  @ApiParam({
    name: 'comment_id',
    description: 'ID of the comment to attach file to',
  })
  @ApiBody({
    type: CommentUploadCompleteDto,
    description:
      'Info about the file uploaded to MinIO (objectName, fileType).',
  })
  @ApiResponse({ status: 200, description: 'File attached successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or cannot attach file to a repost.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (not the comment owner).',
  })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @HttpPost(':comment_id/attach-file')
  async attachFileToComment(
    @Request() req,
    @Param('comment_id', ParseIntPipe) comment_id: number,
    @Query('post_id', ParseIntPipe) post_id: number,
    @Body() uploadCompleteDto: CommentUploadCompleteDto,
  ): Promise<{ message: string; comment: CommentEntity }> {
    const user_id = req.user.user_id;
    const { objectName, fileType } = uploadCompleteDto;

    if (!objectName || !fileType)
      throw new BadRequestException('Missing objectName or fileType.');

    try {
      let convertedHlsObjectName: string = objectName;
      let thumbnail: string | null = null;

      if (fileType === 'video') {
        convertedHlsObjectName = `comments/post_${post_id}/user_${user_id}/hlses/comment_${comment_id}/index.m3u8`;
        thumbnail = `comments/post_${post_id}/user_${user_id}/hlses/comment_${comment_id}/thumbnail.jpg`;

        await this.queue.addCommentVideoConversionJob(
          `comments/post_${post_id}/user_${user_id}/hlses/comment_${comment_id}/`,
          comment_id,
          objectName,
        );
      }

      const success = await this.commentService.attachFileToComment(
        user_id,
        comment_id,
        fileType,
        convertedHlsObjectName,
        thumbnail,
      );
      if (!success)
        throw new InternalServerErrorException('Failed to attach file.');

      const updatedComment =
        await this.commentService.getCommentById(comment_id);
      return {
        message: `${fileType} attached successfully.`,
        comment: updatedComment,
      };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: `Update the text content (body) of a comment` })
  @ApiParam({ name: 'comment_id', description: 'ID of the comment to update' })
  @ApiBody({
    type: CommentDto,
    description: 'Only the "body" field is used for update.',
  })
  @ApiResponse({ status: 200, description: 'Comment updated successfully.' })
  @ApiResponse({ status: 400, description: 'Comment body cannot be empty.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (not the comment owner).',
  })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @Patch(':comment_id')
  async updateCommentText(
    @Request() req,
    @Param('comment_id', ParseIntPipe) comment_id: number,
    @Body() commentDto: CommentDto,
  ): Promise<{ message: string }> {
    const userId = req.user.user_id;
    const updateData = { body: commentDto.body };

    try {
      const success = await this.commentService.updateComment(
        userId,
        comment_id,
        updateData,
      );
      if (!success)
        throw new InternalServerErrorException('Failed to update comment.');
      return { message: 'Comment updated successfully.' };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: `Delete a comment` })
  @ApiParam({ name: 'comment_id', description: 'ID of the comment to delete' })
  @ApiResponse({ status: 204, description: 'Comment deleted successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (not the comment owner).',
  })
  @ApiResponse({ status: 404, description: 'Comment not found.' })
  @Delete(':comment_id')
  async deleteComment(
    @Request() req,
    @Param('comment_id', ParseIntPipe) comment_id: number,
    @Res() res,
  ): Promise<void> {
    const userId = req.user.user_id;
    const role = req.user.role;
    try {
      const success = await this.commentService.deleteComment(
        userId,
        comment_id,
        role,
      );
      if (!success)
        throw new InternalServerErrorException('Failed to delete comment.');
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }
}
