import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { AddMemberDto, MemberUpdateDto } from './dtos/member.dtos';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  getSchemaPath,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Member } from './entities/member.entity';
import { JwtAuthGuard } from '../../guards/jwt.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/role.decorator';

@ApiTags('Conversation-members')
@Controller('members')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  // -> websocket
  @Post('add-member/:conversationId')
  @ApiOperation({ summary: 'Add a member to a conversation' })
  @ApiParam({ name: 'conversationId', description: 'ID of the conversation' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'number',
          description: 'ID of the user to add',
        },
        type: {
          type: 'string',
          description: 'Type of membership',
        },
        role: {
          type: 'string',
          description: 'Role of the member',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 201 },
        description: {
          type: 'string',
          example: 'Member added successfully',
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Member),
        },
      },
    },
  })
  async addMember(
    @Param('conversationId') conversationId: number,
    @Body() addMemberDto: AddMemberDto,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    return {
      status: 201,
      message: 'Member added successfully',
      data: await this.memberService.addMember(
        addMemberDto,
        conversationId,
        userId,
      ),
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
  @ApiResponse({
    status: 200,
    description: 'Member updated successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'number',
          example: 200,
        },
        message: {
          type: 'string',
          example: 'Member updated successfully',
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(Member),
        },
      },
    },
  })
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

  // convert to soft-remove?
  // -> websocket
  @Patch('remove/:id')
  @ApiOperation({ summary: 'Remove a member from a conversation' })
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
  @Patch('leave/:conversationId')
  @ApiOperation({ summary: 'Leave a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Left conversation successfully' })
  @ApiResponse({ status: 404, description: 'M vua bi kick truoc do' })
  async leaveConversation(
    @Param('conversationId') conversationId: number,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    await this.memberService.leaveConversation(Number(conversationId), userId);
    return {
      status: 200,
      message: 'Left conversation successfully',
    };
  }

  // -> websocket
  @Patch(':conversationId')
  @ApiOperation({ summary: 'Accept pending direct conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({
    status: 200,
    description: 'Accepted conversation successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Vo ly',
  })
  async acceptConversation(
    @Param('conversationId') conversationId: number,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    await this.memberService.acceptConversation(Number(conversationId), userId);
    return {
      status: 200,
      message:
        'You have accepted the conversation, now, you and {user} can ...',
    };
  }
}
