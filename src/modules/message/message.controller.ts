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
  Patch,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { MessageService } from './message.service';
import {
  CreateMessageDto,
  GetMessagesDto,
  UpdateMessageDto,
} from './dtos/message.dtos';
import {
  ApiBearerAuth,
  ApiBody,
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
@ApiTags('Messages')
@Controller('messages')
export class MessageController {
  private readonly logger = new Logger(MessageController.name);
  constructor(private readonly messageService: MessageService) {}

  // -> websockets
  @ApiOperation({ summary: 'send message' })
  @ApiResponse({ status: 201, description: 'Message created successfully' })
  @ApiResponse({
    status: 401,
    description: 'You are not an active member of this room',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        roomId: {
          type: 'number',
          description: 'ID of the room',
        },
        body: {
          type: 'string',
          description: 'Message body',
        },
        file: {
          type: 'string',
          description: 'Files to upload',
        },
      },
    },
  })
  @Post('send')
  async create(@Req() req, @Body() createMessageDto: CreateMessageDto) {
    const user_id = req.user.user_id;

    await this.messageService.createMessage(createMessageDto, user_id);
    return {
      statusCode: 201,
      description: 'Message created successfully',
    };
  }

  // -> websockets
  @ApiOperation({ summary: 'Update a message' })
  @ApiResponse({ status: 201, description: 'Message updated successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: {
          type: 'string',
          description: 'Message body',
        },
      },
    },
  })
  @Patch('update/:id')
  async update(
    @Param('id') id: number,
    @Body() updateMessageDto: UpdateMessageDto,
    @Req() req,
  ) {
    await this.messageService.updateMessage(
      id,
      updateMessageDto,
      req.user.user_id,
    );
    return {
      statusCode: 201,
      description: 'Message updated successfully',
    };
  }

  // -> websockets
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({
    status: 401,
    description: 'You are not allowed to delete this message',
  })
  @Delete('delete/:id')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req) {
    await this.messageService.deleteMessage(id, req.user.user_id);
    return {
      statusCode: 200,
      description: 'Message deleted successfully',
    };
  }

  @ApiOperation({ summary: 'Get messages in a room' })
  @ApiResponse({
    status: 201,
    description: 'Messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 201 },
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
  @Get()
  async getMessagesByRoom(@Query() query: GetMessagesDto, @Req() req) {
    const messages = await this.messageService.getMessages(
      req.user.user_id,
      query.roomId,
      query.lastMessageCreatedAt,
      query.limit,
    );
    return {
      statusCode: 201,
      description: 'Messages retrieved successfully',
      data: messages,
    };
  }
}
