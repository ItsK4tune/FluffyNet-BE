import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PostService } from './post.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { PostDto } from './dto/post.dto';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postService: PostService,
  ) {}

  @ApiOperation({ summary: 'Get all posts' })
  @ApiResponse({
    status: 201,
    description: 'List of all posts retrieved successfully',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Get('post-list')
  async getAllPosts() {
    const posts = await this.postService.getAllPosts();
    return {
      message: 'List of all posts retrieved successfully',
      post: posts,
    };
  }

  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({
    status: 201,
    description: 'Post retrieved successfully ',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('user', 'admin')
  @Get('post/:post_id')
  async getPostById(@Param('post_id') post_id: number) {
    const post = await this.postService.findOneById(post_id);
    if (post) {
      return {
        message: 'Post retrieved successfully',
        post: post,
      };
    }
    throw new NotFoundException('Post not found');
  }

  @ApiOperation({ summary: 'Create a new post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string', example: 'This is a post body' },
        image: { type: 'string', example: 'image-url.jpg' },
        video: { type: 'string', example: 'video-url.mp4' },
        repost_id: { type: 'number', example: 5 },
      },
      oneOf: [
        { required: ['body'] },
        { required: ['image'] },
        { required: ['video'] },
        { required: ['repost_id']},
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 400, description: 'Repost_id invalid' })
  @Post('post/:post_id')
  async createPost(@Request() req, @Body() postDto: PostDto) {
    const user_id = req.user.user_id;
    const newPost = await this.postService.createPost(user_id, postDto);
    if (!newPost) throw new BadRequestException('Repost_id invalid');
    return { message: 'Post created successfully' }
  }

  @ApiOperation({ summary: 'Update a post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string', example: 'Updated post body' },
        image: { type: 'string', example: 'updated-image-url.jpg' },
        video: { type: 'string', example: 'updated-video-url.mp4' },
      },
      oneOf: [
        { required: ['body'] },
        { required: ['image'] },
        { required: ['video'] },
      ],
    },
  })
  @ApiResponse({ status: 200, description: 'Post updated successfully ' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 409, description: 'User is not the owner' })
  @Patch('post/:post_id')
  async updatePost(@Request() req,
    @Param('post_id') post_id: number,
    @Body() postDto: PostDto,
  ) {
    const user_id = req.user.user_id;
    const updatedPost = await this.postService.updatePost(
      user_id,
      post_id,
      postDto,
    );

    if (updatedPost == null)  throw new NotFoundException('Post not found');
    if (updatedPost == false)  throw new ConflictException('User is not the owner');

    return { message: 'Post updated successfully' };
  }

  @ApiOperation({ summary: 'Delete a post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiResponse({ status: 200, description: 'Post deleted successfully ' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @ApiResponse({ status: 409, description: 'User is not the owner of this post' })
  @Delete('post/:post_id')
  async deletePost(@Request() req, @Param('post_id') post_id: number) {
    const user_id = req.user.user_id;
    const result = await this.postService.deletePost(user_id, post_id);

    if (result == null)  throw new NotFoundException('Post not found');
    if (result == false)  throw new ConflictException('User is not the owner of this post');

    return { message: 'Post deleted successfully' };
  }
}