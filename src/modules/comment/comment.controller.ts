import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto } from './dtos/create-comment.dto';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import {
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Comment')
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @ApiOperation({ summary: `Get all comments by post`, description: `Return all comments of a post.` })
  @ApiResponse({ status: 200, description: 'Fetch comments successfully' })
  @ApiResponse({ status: 404, description: 'Post not found' })
  @Get('post/:post_id')
  async getCommentsByPost(@Param('post_id') post_id: string) {
    return this.commentService.getCommentsByPost(post_id);
  }

  @ApiOperation({ summary: `Get a comment by ID`, description: `Return a single comment by its ID.` })
  @ApiResponse({ status: 200, description: 'Fetch comment successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @Get(':comment_id')
  async getCommentById(@Param('comment_id') comment_id: string) {
    const comment = await this.commentService.getCommentById(comment_id);
    if (!comment) throw new NotFoundException({ message: 'Comment not found' });
    return comment;
  }

  @ApiOperation({ summary: `Create a new comment`, description: `Add a new comment to a post.` })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiBody({ type: CreateCommentDto })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async createComment(@Request() req, @Body() createCommentDto: CreateCommentDto) {
    return this.commentService.createComment(req.user.user_id, createCommentDto);
  }

  @ApiOperation({ summary: `Update a comment`, description: `Authenticate user, check authorization, and update comment content.` })
  @ApiResponse({ status: 200, description: 'Comment updated successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @ApiBody({ type: UpdateCommentDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiBearerAuth()
  @Patch(':comment_id')
  async updateComment(
    @Request() req,
    @Param('comment_id') comment_id: string,
    @Body() updateCommentDto: UpdateCommentDto
  ) {
    return this.commentService.updateComment(req.user.user_id, comment_id, updateCommentDto);
  }

  @ApiOperation({ summary: `Delete a comment`, description: `Authenticate user, check authorization, and delete a comment.` })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiBearerAuth()
  @Delete(':comment_id')
  async deleteComment(@Request() req, @Param('comment_id') comment_id: string) {
    return this.commentService.deleteComment(req.user.user_id, comment_id);
  }
}
