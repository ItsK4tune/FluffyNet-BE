import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostUil } from 'src/utils/queries/post.util';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { CreatePostDto } from './dto/create-post-dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly postUtil: PostUil,
  ) {}

  @ApiOperation({ summary: 'Get all posts' })
  @ApiResponse({
    status: 200,
    description: 'List of all posts retrieved successfully',
  })
  @Get()
  async getAllPosts() {
    const posts = await this.postsService.getAllPosts();
    return {
      message: 'List of all posts retrieved successfully',
      statusCode: 200,
      posts,
    };
  }

  @ApiOperation({ summary: 'Get post by ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully ',
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @Get('/:post_id')
  async getPostById(@Param('post_id') post_id: number) {
    const post = await this.postsService.findOneById(post_id);
    if (post) {
      return {
        message: 'Post retrieved successfully',
        statusCode: 200,
        post,
      };
    }
    return {
      message: 'Post not found',
      statusCode: 404,
    };
  }

  @ApiOperation({ summary: 'Create a new post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', example: 1 },
        body: { type: 'string', example: 'This is a post body' },
        image: { type: 'string', example: 'image-url.jpg' },
        video: { type: 'string', example: 'video-url.mp4' },
        repost_id: { type: 'number', example: 5 },
      },
      required: ['user_id'],
      oneOf: [
        { required: ['body'] },
        { required: ['image'] },
        { required: ['video'] },
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Post created successfully ' })
  @ApiResponse({ status: 400, description: 'Bad request ' })
  @Post()
  async createPost(@Body() createPostDto: CreatePostDto) {
    const newPost = await this.postsService.createPost(createPostDto);
    return {
      message: 'Post created successfully',
      statusCode: 201,
      newPost,
    };
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
  @Patch('/:post_id')
  async updatePost(
    @Param('post_id') post_id: number,
    @Body() updatedPostDto: UpdatePostDto,
  ) {
    const updatedPost = await this.postsService.updatePost(
      post_id,
      updatedPostDto,
    );
    if (updatedPost) {
      return {
        message: 'Post updated successfully',
        statusCode: 200,
        updatedPost,
      };
    }
    return { message: 'Post not found', statusCode: 404 };
  }

  @ApiOperation({ summary: 'Delete a post' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiResponse({ status: 200, description: 'Post deleted successfully ' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @Delete('/:post_id')
  async deletePost(@Param('post_id') post_id: number) {
    const result = await this.postsService.deletePost(post_id);
    if (result.affected > 0) {
      return { message: 'Post deleted successfully', statusCode: '200' };
    }
    return {
      message: 'Post not found',
      statusCode: 404,
    };
  }
}
