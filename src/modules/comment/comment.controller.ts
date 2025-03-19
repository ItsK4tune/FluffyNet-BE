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
  ForbiddenException,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentDto } from './dtos/comment.dto';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import {
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('Comment')
@Controller('comment')
export class CommentController {
    constructor(private readonly commentService: CommentService) {}

    @ApiOperation({ summary: `Get all comments by post`, description: `Return all comments of a post.` })
    @ApiResponse({ status: 200, description: 'Fetch comments successfully' })
    @ApiResponse({ status: 404, description: 'Post not found' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @Get(':post_id')
    async getCommentsByPost(@Param('post_id') post_id: number) {
        const comment = await this.commentService.getCommentsByPost(post_id);
        if (comment === null) throw new NotFoundException('Post not found');
        return { message: 'Fetch comments successfully', comment: comment };
    }

    //   @ApiOperation({ summary: `Get a comment by ID`, description: `Return a single comment by its ID.` })
    //   @ApiResponse({ status: 200, description: 'Fetch comment successfully' })
    //   @ApiResponse({ status: 404, description: 'Comment not found' })
    //   @Get(':comment_id')
    //   async getCommentById(@Param('comment_id') comment_id: string) {
    //     const comment = await this.commentService.getCommentById(comment_id);
    //     if (!comment) throw new NotFoundException({ message: 'Comment not found' });
    //     return comment;
    //   }

    @ApiOperation({ summary: `Create a new comment`, description: `Add a new comment to a post.` })
    @ApiResponse({ status: 201, description: 'Comment created successfully' })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'image', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ]))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
        type: 'object',
        properties: {
            body: { type: 'string', example: 'Post post body' },
            image: { type: 'file', format: 'jpeg/png' },
            video: { type: 'file', format: 'mp4' },
            parent_id: {type: 'number', example: 1 },
        },
        oneOf: [
            { required: ['body'] },
            { required: ['image'] },
            { required: ['video'] },
        ],
        },
    })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @Post('/create-comment/:post_id')
    async createComment(@Param('post_id') post_id: number, @Request() req, @Body() commentDto: CommentDto, @UploadedFiles() files: { image?: any, video?: any }) {
        const user_id = req.user.user_id
        const status = await this.commentService.createComment(post_id, user_id, commentDto, files);
        if (status) return { message: 'Comment created successfully' };
    }

    @ApiOperation({ summary: `Update a comment`, description: `Authenticate user, check authorization, and update comment content.` })
    @ApiResponse({ status: 200, description: 'Comment updated successfully' })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @ApiResponse({ status: 409, description: 'Not allowed' })
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'image', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ]))
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
        type: 'object',
        properties: {
            body: { type: 'string', example: 'Updated post body' },
            image: { type: 'file', format: 'jpeg/png' },
            video: { type: 'file', format: 'mp4' },
        },
        oneOf: [
            { required: ['body'] },
            { required: ['image'] },
            { required: ['video'] },
        ],
        },
    })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @Patch(':post_id/:comment_id')
    async updateComment(
        @Request() req,
        @Param('comment_id') comment_id: number,
        @Param('post_id') post_id: number,
        @Body() commentDto: CommentDto,
        @UploadedFiles() files: { image?: any, video?: any }
    ) {
        const user_id = req.user.user_id;
        const status = await this.commentService.updateComment(post_id, user_id, comment_id, commentDto, files);
        if (status === null)    throw new NotFoundException('Comment not found');
        if (status === false)    throw new ForbiddenException('Not allowed');
        return { message: 'Comment updated successfully' };
    }

    @ApiOperation({ summary: `Delete a comment`, description: `Authenticate user, check authorization, and delete a comment.` })
    @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
    @ApiResponse({ status: 404, description: 'Comment not found' })
    @ApiResponse({ status: 409, description: 'Not allowed' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @Delete('post_id/:comment_id')
    async deleteComment(@Request() req, @Param('comment_id') comment_id: number, @Param('post_id') post_id: number) {
        const user_id = req.user.user_id;
        const status = await this.commentService.deleteComment(post_id, user_id, comment_id);
        if (status === null)    throw new NotFoundException('Comment not found');
        if (status === false)    throw new ForbiddenException('Not allowed');
        return { message: 'Comment updated successfully' };
    }
}
