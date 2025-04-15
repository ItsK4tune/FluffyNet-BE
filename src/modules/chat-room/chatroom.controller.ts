import {
  Body,
  Controller,
  Delete,
  Get, Logger,
  Param, ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import { ChatroomService } from './chatroom.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/role.decorator';
import { ChatRoom } from './entities/room.entity';
import { CreateRoomDto, UpdateRoomDto } from './dtos/room.dtos';

@ApiTags('Chat Room')
@Controller('chatroom')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
export class ChatroomController {
  private readonly logger = new Logger(ChatroomController.name);
  constructor(private readonly chatroomService: ChatroomService) {}

  // -> websockets
  @ApiOperation({ summary: 'Create a new group chat' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'New chat room',
        },
        userIds: {
          type: 'array',
          items: {
            type: 'number',
          },
          example: [1, 2, 3],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @Post('create-group')
  async createChatRoom(@Body() createRoomDto: CreateRoomDto, @Req() req) {
    await this.chatroomService.createChatRoom(createRoomDto, req.user.user_id);
    return {
      statusCode: 200,
      message: 'Chat room created',
    };
  }

  // -> websockets
  @ApiOperation({ summary: 'Create a direct chat with another user' })
  @ApiParam({ name: 'userId', description: 'ID of the user to chat with' })
  @ApiResponse({ status: 200, description: 'Direct chat created' })
  @Post('create-direct/:userId')
  async createDirectChatRoom(@Param('userId') userId: number, @Req() req) {
    return await this.chatroomService.createDirectChatRoom(
      req.user.user_id,
      userId,
    );
  }

  @ApiOperation({ summary: 'Get all rooms for the current user by type' })
  @ApiParam({
    name: 'type',
    description: 'Room type: active or pending',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns all rooms',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Chat rooms retrieved successfully',
        },
        rooms: {
          type: 'array',
          items: {
            $ref: getSchemaPath(ChatRoom),
          },
        },
      },
    },
  })
  @Get('user/:type')
  async getUserChatRooms(@Param('type') type: string, @Req() req) {
    const rooms = await this.chatroomService.getRoomsByUserId(
      req.user.user_id,
      type,
    );
    return {
      statusCode: 201,
      message: 'Chat rooms retrieved successfully',
      rooms: rooms,
    };
  }

  // -> websockets
  @ApiOperation({ summary: 'Update room (rename)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'New room name' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  @Patch('update/:id')
  async updateChatRoom(
    @Param('id') id: number,
    @Body() updateRoomDto: UpdateRoomDto,
    @Req() req,
  ) {
    await this.chatroomService.updateRoom(id, updateRoomDto, req.user.user_id);
    return {
      statusCode: 200,
      message: 'Room updated successfully',
    };
  }

  // -> websockets
  @ApiOperation({ summary: 'Delete a room (admin only)' })
  @ApiParam({ name: 'id', description: 'Room ID' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  @ApiResponse({ status: 401, description: 'Only admin can delete room' })
  @Delete('delete/:id')
  async deleteChatRoom(@Param('id', ParseIntPipe) id: number, @Req() req) {
    await this.chatroomService.deleteRoom(id, req.user.user_id);
    return {
      statusCode: 200,
      message: 'room deleted successfully',
    };
  }
}
