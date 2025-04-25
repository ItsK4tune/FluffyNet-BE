import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post as HttpPost,
  Query,
  Request,
  UseGuards,
  InternalServerErrorException,
  Res,
  Req,
} from '@nestjs/common';
import { PostService } from './post.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { PostDto } from './dto/post.dto';
import type { Post } from './entities/post.entity';
import { PostUploadCompleteDto } from './dto/post-upload.dto';
import { MinioClientService } from '../minio-client/minio-client.service';
import { PostUploadPresignDto } from './dto/post-upload.dto';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';
import { QueueService } from '../minio-client/queue.service';

@ApiTags('Post')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('post')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly minioClientService: MinioClientService,
    private readonly queue: QueueService,
  ) {}

  @ApiOperation({ summary: 'Get all posts of target' })
  @ApiResponse({
    status: 201,
    description: 'post',
  })
  @Get('list/target/:target_id')
  async getPostsByUserId(
    @Req() req,
    @Param('target_id') target_id: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('order') order?: string,
  ) {
    const user_id = req.user.user_id;
    const take = limit > 50 ? 50 : limit;
    const skip = (page - 1) * take;
    const posts = await this.postService.getPostsByUserId(user_id, target_id, {
      skip,
      take,
      order,
    });
    return { posts };
  }

  @ApiOperation({ summary: 'Get all posts' })
  @ApiResponse({
    status: 201,
    description: 'post',
  })
  @Get('list/all')
  async getAllPosts(
    @Req() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('order') order?: string,
  ) {
    const user_id = req.user.user_id;
    const take = limit > 50 ? 50 : limit;
    const skip = (page - 1) * take;
    const posts = await this.postService.getAllPosts(user_id, {
      skip,
      take,
      order,
    });
    return { message: 'hello', posts };
  }

  @ApiOperation({ summary: 'Get posts from users you follow (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'List of posts from following users.',
  })
  @Get('list/following')
  async getPostsOfFollowing(
    @Request() req,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('order') order?: string,
  ) {
    const user_id = req.user.user_id;
    const take = limit > 50 ? 50 : limit;
    const skip = (page - 1) * take;
    const posts = await this.postService.getPostsOfFollowing(user_id, {
      skip,
      take,
      order,
    });
    return { posts };
  }

  @ApiOperation({ summary: 'Create a new text post or repost' })
  @ApiBody({
    type: PostDto,
    description:
      'Post content (body) or original post ID to repost (repost_id). Do not provide image/video here.',
  })
  @ApiResponse({ status: 201, description: 'Post created successfully.' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input (e.g., missing body and repost_id, or reposting non-existent post).',
  })
  @HttpPost()
  async createPost(
    @Request() req,
    @Body() postDto: PostDto,
  ): Promise<{ message: string; post: Post }> {
    const user_id = req.user.user_id;
    const { image, video, ...restDto } = postDto as any;
    try {
      const newPost = await this.postService.createPost(user_id, restDto);
      return {
        message:
          'Post created successfully. Upload files separately if needed.',
        post: newPost,
      };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get presigned URL for uploading a post file' })
  @ApiResponse({ status: 201, description: 'Presigned URL generated.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input (e.g., invalid mime type).',
  })
  @HttpPost('generate-upload-url')
  async getPresignedUploadUrl(
    @Request() req,
    @Body() uploadPresignDto: PostUploadPresignDto,
  ): Promise<{ presignedUrl: string; objectName: string }> {
    const { filename, contentType } = uploadPresignDto;
    const user_id = req.user.user_id;

    // const fileExtension = filename.split('.').pop() || '';
    const fileTypePrefix = contentType.startsWith('image/')
      ? 'images'
      : contentType.startsWith('video/')
        ? 'videos'
        : 'others';
    const prefix = `posts/user_${user_id}/${fileTypePrefix}/`;

    try {
      const result = await this.minioClientService.generatePresignedUploadUrl(
        filename,
        contentType,
        prefix,
        convertToSeconds(env.minio.time),
      );
      return result;
    } catch (error) {
      console.log('error in Controller');
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Could not generate upload URL.');
    }
  }

  @ApiOperation({ summary: 'Attach an image or video to an existing post' })
  @ApiBody({ description: 'Information about the uploaded file.' })
  @ApiResponse({ status: 200, description: 'File attached successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or cannot attach file to a repost.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden (not the post owner).' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @HttpPost(':post_id/attach-file')
  async attachFile(
    @Request() req,
    @Param('post_id', ParseIntPipe) post_id: number,
    @Body() uploadCompleteDto: PostUploadCompleteDto,
  ): Promise<{ message: string; post: Post }> {
    const user_id = req.user.user_id;
    const role = req.user.role;
    const { objectName, fileType } = uploadCompleteDto;

    if (!objectName || !fileType)
      throw new BadRequestException('Missing objectName or fileType.');

    try {
      let convertedHlsObjectName: string = objectName;
      let thumbnail: string | null = null;
      if (fileType === 'video') {
        convertedHlsObjectName = `posts/user_${user_id}/hlses/post_${post_id}/index.m3u8`;
        thumbnail = `posts/user_${user_id}/hlses/post_${post_id}/thumbnail.jpg`;

        await this.queue.addPostVideoConversionJob(
          `posts/user_${user_id}/hlses/post_${post_id}/`,
          post_id,
          objectName,
        );
      }

      const success = await this.postService.attachFileToPost(
        user_id,
        post_id,
        role,
        fileType,
        convertedHlsObjectName,
        thumbnail,
      );
      if (!success) {
        throw new InternalServerErrorException(
          'Failed to update post with attachment.',
        );
      }
      const updatedPost = await this.postService.findOneById(post_id);
      if (!updatedPost)
        throw new NotFoundException('Post not found after attachment update.');

      return {
        message: `${fileType} attached successfully.`,
        post: updatedPost,
      };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @ApiParam({
    name: 'post_id',
    type: Number,
    description: 'ID of the post to retrieve',
  })
  @Get(':post_id')
  async getPostById(
    @Param('post_id', ParseIntPipe) postId: number,
  ): Promise<{ message: string; post: Post }> {
    try {
      const post = await this.postService.findOneById(postId);
      if (!post) {
        throw new NotFoundException('Post not found.');
      }

      return { message: 'Post retrieved successfully.', post };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: 'Update the text content (body) of a post' })
  @ApiBody({
    type: PostDto,
    description: 'Only the body field will be considered for update.',
  })
  @ApiResponse({ status: 200, description: 'Post updated successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the post owner).' })
  @Patch(':post_id')
  async updatePostText(
    @Request() req,
    @Param('post_id', ParseIntPipe) postId: number,
    @Body() postDto: PostDto,
  ): Promise<{ message: string; post: Post }> {
    const user_id = req.user.user_id;
    const role = req.user.role;
    const updateData: Partial<PostDto> = { body: postDto.body };

    try {
      const success = await this.postService.updatePost(
        user_id,
        postId,
        role,
        updateData,
      );
      if (!success) {
        throw new InternalServerErrorException(
          'Post update failed for an unknown reason.',
        );
      }
      const updatedPost = await this.postService.findOneById(postId);
      if (!updatedPost)
        throw new NotFoundException('Post not found after update.');

      return { message: 'Post updated successfully.', post: updatedPost };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: 'Delete a post' })
  @ApiResponse({ status: 204, description: 'Post deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the post owner).' })
  @Delete(':post_id')
  async deletePost(
    @Request() req,
    @Param('post_id', ParseIntPipe) postId: number,
    @Res() res,
  ): Promise<void> {
    const user_id = req.user.user_id;
    const role = req.user.role;
    try {
      const success = await this.postService.deletePost(user_id, postId, role);
      if (!success) {
        throw new InternalServerErrorException(
          'Post deletion failed for an unknown reason.',
        );
      }
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }
}
