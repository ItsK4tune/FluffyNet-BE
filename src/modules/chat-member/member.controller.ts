import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { AddMemberDto, MemberUpdateDto } from './dtos/member.dtos';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/role.decorator';

@ApiTags('chat-members')
@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
export class MemberController {
  constructor(private readonly memberService: MemberService) {}
  private logger = new Logger('MemberController');
  // -> websocket

  @Post('add-member/:roomId')
  @ApiOperation({ summary: 'Add a member to a room' })
  @ApiParam({ name: 'roomId', description: 'ID of the room' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'number',
          description: 'ID of the user to add',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  async addMember(
    @Param('roomId') roomId: number,
    @Body() addMemberDto: AddMemberDto,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    this.logger.log('user_id', userId);
    this.logger.log('addMemberDto', JSON.stringify(addMemberDto));
    this.logger.log('roomId', roomId);
    await this.memberService.addMember(addMemberDto, roomId, userId);
    return {
      status: 201,
      message: 'Member added successfully',
    };
  }

  // -> websocket
  @Patch('update/:id')
  @ApiOperation({ summary: 'Update member information' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nickname: {
          type: 'string',
          example: 'Nguyen Giap',
        },
        role: {
          type: 'string',
          example: 'admin',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  async updateMember(
    @Param('id') id: number,
    @Body() updateMemberDto: MemberUpdateDto,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    await this.memberService.updateMember(Number(id), updateMemberDto, userId);
    return {
      status: 200,
      message: 'Member updated successfully',
    };
  }

  // -> websocket
  @Patch('remove/:id')
  @ApiOperation({ summary: 'Remove a member from a room' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  async removeMember(@Param('id') id: number, @Req() req) {
    const userId = req.user.user_id;
    await this.memberService.removeMember(Number(id), userId);
    return {
      status: 200,
      message: 'Member removed successfully',
    };
  }

  // -> websocket
  @Patch('leave/:roomId')
  @ApiOperation({ summary: 'Leave a room' })
  @ApiParam({ name: 'roomId', description: 'room ID' })
  @ApiResponse({ status: 200, description: 'Left room successfully' })
  async leaveRoom(@Param('roomId') roomId: number, @Req() req) {
    const userId = req.user.user_id;
    await this.memberService.leaveRoom(roomId, userId);
    return {
      status: 200,
      message: 'Left room successfully',
    };
  }

  // -> websocket
  @Patch('accept/:roomId')
  @ApiOperation({ summary: 'Accept pending direct room' })
  @ApiParam({ name: 'roomId', description: 'room ID' })
  @ApiResponse({ status: 200, description: 'Accepted chat successfully' })
  async acceptRoom(@Param('roomId') roomId: number, @Req() req) {
    const userId = req.user.user_id;
    await this.memberService.acceptChat(roomId, userId);
    return {
      status: 200,
      message: 'You have accepted this chat now, you can start messaging.',
    };
  }
}
