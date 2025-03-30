import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Patch,
  Logger,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { GetMessagesDto } from './dtos/message.dtos';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Message } from './entities/message.entity';
import { JwtAuthGuard } from '../../guards/jwt.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/role.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
@ApiTags('Messages')
@Controller('messages')
export class MessageController {
  private readonly logger = new Logger(MessageController.name);
  constructor(private readonly messageService: MessageService) {}

  // -> websockets
  @ApiOperation({ summary: 'Create new message' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
      { name: 'audio', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: {
          type: 'string',
          example: 'Hello',
        },
        image: {
          type: 'file',
          format: 'jpeg/png',
        },
        video: {
          type: 'file',
          format: 'video/mp4',
        },
        audio: {
          type: 'file',
          format: 'audio/mpeg',
        },
        file: {
          type: 'file',
          format: 'application/pdf',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @Post(':conversation_id/send')
  async createMessage(
    @Req() req,
    @Param('conversation_id') conversation_id: number,
    @Body('body') body: string,
    @UploadedFiles()
    files: { image?: any; video?: any; audio?: any; file?: any },
  ) {
    const user_id = req.user.user_id;

    const message = await this.messageService.create(
      conversation_id,
      body,
      user_id,
      files,
    );
    return {
      statusCode: 201,
      description: 'Message created successfully',
      data: message,
    };
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'image', maxCount: 1 },
      { name: 'video', maxCount: 1 },
      { name: 'audio', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: {
          type: 'string',
          example: 'Hello',
        },
        image: {
          type: 'file',
          format: 'jpeg/png',
        },
        video: {
          type: 'file',
          format: 'video/mp4',
        },
        audio: {
          type: 'file',
          format: 'audio/mpeg',
        },
        file: {
          type: 'file',
          format: 'application/pdf',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Message updated successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @Patch(':id/update')
  async updateMessage(
    @Param('id') id: number,
    @Body('body') body: string,
    @Req() req,
    @UploadedFiles()
    files: { image?: any; video?: any; audio?: any; file?: any },
  ) {
    const message = await this.messageService.updateMessage(
      id,
      body,
      files,
      req.user.user_id,
    );
    return {
      statusCode: 201,
      description: 'Message updated successfully',
      data: message,
    };
  }

  // -> websockets
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  @ApiResponse({
    status: 401,
    description: 'You are not allowed to delete this message',
  })
  @Delete('delete/:id')
  async deleteMessage(@Param('id') id: number, @Req() req) {
    await this.messageService.deleteMessage(id, req.user.user_id);
    return {
      statusCode: 200,
      description: 'Message deleted successfully',
    };
  }

  @ApiOperation({ summary: 'Get all messages in a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        description: {
          type: 'string',
          example: 'Messages retrieved successfully',
        },
        data: {
          type: 'array',
          items: { type: 'object', $ref: getSchemaPath(Message) },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'You are not an active member of this conversation',
  })
  @Get('conversation')
  async getMessagesByConversation(@Query() query: GetMessagesDto, @Req() req) {
    const messages = await this.messageService.getMessages(
      req.user.user_id,
      query.conversation_id,
      query.lastMessageCreatedAt,
      query.limit,
    );
    return {
      statusCode: 200,
      description: 'Messages retrieved successfully',
      data: messages,
    };
  }
}
