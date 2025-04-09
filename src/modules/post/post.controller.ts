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
} from '@nestjs/common';
import { PostService } from './post.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { PostDto } from './dto/post.dto';
import type { Post } from './entities/post.entity';
import { PostUploadCompleteDto } from './dto/post-upload.dto';
import { promises } from 'dns';

@ApiTags('Post')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('post')
export class PostController {
  constructor(
    private readonly postService: PostService,
  ) { }

  @ApiOperation({ summary: 'Get all posts' })
  @ApiResponse({
    status: 201,
    description: 'post',
  })
  @Get('list/all')
  async getAllPosts(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    const take = limit > 50 ? 50 : limit;
    const skip = (page - 1) * take;
    const posts = await this.postService.getAllPosts({ skip, take });
    return { posts };
  }

  @ApiOperation({ summary: 'Get posts from users you follow (paginated)' })
  @ApiResponse({ status: 200, description: 'List of posts from following users.' })
  @Get('list/following')
  async getPostsOfFollowing(@Request() req, @Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    const user_id = req.user.user_id;
    const take = limit > 50 ? 50 : limit;
    const skip = (page - 1) * take;
    // Cần sửa PostService.getPostsOfFollowing để nhận skip/take
    const posts = await this.postService.getPostsOfFollowing(user_id /*, { skip, take } */);
    return { posts };
  }

  @ApiOperation({ summary: 'Create a new text post or repost' })
  @ApiBody({ type: PostDto, description: 'Post content (body) or original post ID to repost (repost_id). Do not provide image/video here.' })
  @ApiResponse({ status: 201, description: 'Post created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input (e.g., missing body and repost_id, or reposting non-existent post).' })
  @HttpPost()
  async createPost(@Request() req, @Body() postDto: PostDto): Promise<{ message: string; post: Post }> {
    const user_id = req.user.user_id;
    const { image, video, ...restDto } = postDto as any;

    if (Object.keys(restDto).length === 0 || (!restDto.body && !restDto.repost_id)) {
      throw new BadRequestException("Post requires either 'body' or 'repost_id'.");
    }

    try {
      const newPost = await this.postService.createPost(user_id, restDto);
      return { message: 'Post created successfully. Upload files separately if needed.', post: newPost };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({ summary: 'Attach an image or video to an existing post' })
  @ApiBody({ description: 'Information about the uploaded file.' })
  @ApiResponse({ status: 200, description: 'File attached successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input or cannot attach file to a repost.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the post owner).' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @HttpPost(':post_id/attach-file')
  async attachFile(
    @Request() req,
    @Param('post_id', ParseIntPipe) postId: number,
    @Body() uploadCompleteDto: PostUploadCompleteDto
  ): Promise<{ message: string; post: Post }> {
    const user_id = req.user.user_id;
    const role = req.user.role;
    const { objectName, fileType } = uploadCompleteDto;

    if (!objectName || !fileType) throw new BadRequestException("Missing objectName or fileType.");

    try {
      const success = await this.postService.attachFileToPost(user_id, postId, role, fileType, objectName);
      if (!success) {
        throw new InternalServerErrorException('Failed to update post with attachment.');
      }
      const updatedPost = await this.postService.findOneById(postId);
      if (!updatedPost) throw new NotFoundException("Post not found after attachment update."); // Nên có

      return { message: `${fileType} attached successfully.`, post: updatedPost };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Generate a presigned upload URL for image or video',
  })
  @ApiBody({
    description: 'File type and file name',
    required: true,
    schema: {
      type: 'object',
      properties: {
        fileType: {
          type: 'string',
          enum: ['image', 'video'],
        },
        fileName: {
          type: 'string',
        },
      },
    },
  })
  @HttpPost('upload-url')
  async generateUploadUrl(
    @Body() body: { fileType: 'image' | 'video'; fileName: string },
  ): Promise<{ uploadUrl: string; objectName: string }> {
    const { fileType, fileName } = body;

    const contentTypeMap: Record<string, string> = {
      image: 'image/png',
      video: 'video/mp4',
    };

    if (!fileType || !fileName || !contentTypeMap[fileType]) {
      throw new BadRequestException('Invalid or missing fileType or fileName.');
    }

    try {
      const { uploadUrl, objectName } = await this.postService.generateUploadUrl(
          fileName,
          contentTypeMap[fileType],
          fileType,
        );

      return { uploadUrl, objectName };
    } catch (error) {
      throw error;
    }
  }

  @ApiOperation({
    summary: 'Generate a presigned download URL for image or video',
  })
  @ApiQuery({
    name: 'objectName',
    type: String,
    required: true,
    description: 'The name of the object in MinIO',
  })
  @Get('download-url')
  async generateDownloadUrl(
    @Query('objectName') objectName: string,
  ): Promise<{ downloadUrl: string }> {
    if (!objectName) {
      throw new BadRequestException('objectName is required.');
    }

    try {
      const downloadUrl = await this.postService.generateDownLoadUrl(objectName);

      if (!downloadUrl) {
        throw new BadRequestException(
          'File does not exist or cannot generate download URL.',
        );
      }

      return { downloadUrl };
    } catch (error) {
      throw error;
    }
  }




  @ApiOperation({ summary: 'Get a post by ID' })
  @ApiResponse({ status: 200, description: 'Post retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @ApiParam({ name: 'post_id', type: Number, description: 'ID of the post to retrieve' })
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
  @ApiBody({ type: PostDto, description: 'Only the body field will be considered for update.' })
  @ApiResponse({ status: 200, description: 'Post updated successfully.' })
  @ApiResponse({ status: 404, description: 'Post not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the post owner).' })
  @Patch(':post_id')
  async updatePostText(@Request() req, @Param('post_id', ParseIntPipe) postId: number, @Body() postDto: PostDto): Promise<{ message: string; post: Post }> {
    const userId = req.user.user_id;
    const role = req.user.role;
    const updateData: Partial<PostDto> = { body: postDto.body };

    try {
      const success = await this.postService.updatePost(userId, postId, role, updateData);
      if (!success) {
        throw new InternalServerErrorException('Post update failed for an unknown reason.');
      }
      const updatedPost = await this.postService.findOneById(postId);
      if (!updatedPost) throw new NotFoundException("Post not found after update.");

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
  async deletePost(@Request() req, @Param('post_id', ParseIntPipe) postId: number, @Res() res): Promise<void> {
    const userId = req.user.user_id;
    const role = req.user.role;
    try {
      const success = await this.postService.deletePost(userId, postId, role);
      if (!success) {
        throw new InternalServerErrorException('Post deletion failed for an unknown reason.');
      }
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  }
}