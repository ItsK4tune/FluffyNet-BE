import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Post,
  Body,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from 'src/decorators/role.decorator';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { FollowService } from './follow.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
@ApiTags('Follow')
@Controller('follow')
export class FollowController {
    constructor(
        private readonly followService: FollowService
    ) {}

    @ApiOperation({ summary: `Get status whether user has follow target`, description: `Authenticate, authorize and return user's following status toward target.` })
    @ApiResponse({ status: 201, description: 'true' })
    @ApiResponse({ status: 201, description: 'false' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @Get('follow-status')
    async getStatus(@Request() req: any, @Query('target_id') target_id: number) {
        const user_id: number = req.user.user_id;
        const status = await this.followService.getStatus(user_id, target_id);
        if (status === 400) throw new BadRequestException('User not found');
        return { status: status };
    }

    @ApiOperation({ summary: `Set follow status from user to target`, description: `Authenticate, authorize and set user's following status toward target.` })
    @ApiBody({
        schema: {
            type: 'object', 
            properties: {
                target_id: { type: 'number', example: 1 }, 
            },
            required: ['target_id'],
        },
    })
    @ApiResponse({ status: 201, description: 'true' })
    @ApiResponse({ status: 201, description: 'false' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @ApiResponse({ status: 409, description: 'Cannot follow yourself' })
    @Post('')
    async setStatus(@Request() req: any, @Body('target_id') target_id: number) {
        const user_id: number = req.user.user_id;
        if (user_id === target_id)  throw new ConflictException('Cannot follow yourself');
        const status = await this.followService.followTarget(user_id, target_id);
        if (status === null)    throw new BadRequestException('User not found');
        return { status: status };
    }

    @ApiOperation({ summary: `Get all target following`, description: `Get target's following list.` })
    @ApiResponse({ status: 201, description: 'following list' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @Get('following')
    async getFollowingList(@Query('user_id') user_id: number) {
        const list = await this.followService.followingList(user_id);
        if (!list)  throw new BadRequestException('User not found');
        return { list: list }
    }

    @ApiOperation({ summary: `Get all target follower`, description: `Get target's follower list.` })
    @ApiResponse({ status: 201, description: 'follower list' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @Get('follower')
    async getFollowerList(@Query('user_id') user_id: number) {
        const list = await this.followService.followerList(user_id);
        if (!list)  throw new BadRequestException('User not found');
        return { list: list }
    }

    @ApiOperation({ summary: `Get suggest follower`, description: `Get user's follow suggestion list.` })
    @ApiResponse({ status: 201, description: 'suggestion list' })
    @Get('follow-suggest')
    async getSuggestionList(@Request() req) {
        const user_id = req.user.user_id;
        const list = await this.followService.suggestionList(user_id);
        return { list: list }
    }
}
