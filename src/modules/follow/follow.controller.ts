import { Controller, Get, Query, UseGuards, Request, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/role.decorator';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { FollowService } from './follow.service';

@ApiTags('Follow')
@Controller('follow')
export class FollowController {
    constructor(
        private readonly followService: FollowService,
    ) {}

    @ApiOperation({ summary: `Get status whether user has follow target`, description: `Authenticate, authorize and return user's following status toward target.` })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
    @ApiResponse({ status: 200, description: 'Followed' })
    @ApiResponse({ status: 200, description: 'Not followed' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @ApiResponse({ status: 409, description: 'Cannot follow yourself' })
    @Get('follow-status')
    async getStatus(@Request() req: any, @Query('target_id') target_id: number) {
        const user_id: number = req.user.user_id     
        const status = await this.followService.getStatus(user_id, target_id);
        if (status) return { message: "Followed", statusCode: 200 };
        return { message: "Not followed", statusCode: 200 };
    }

    @ApiOperation({ summary: `Set follow status from user to target`, description: `Authenticate, authorize and set user's following status toward target.` })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
    @ApiBody({
        schema: {
            type: 'object', 
            properties: {
                target_id: { type: 'number', example: 1 }, 
            },
            required: ['target_id'],
        },
    })
    @ApiResponse({ status: 200, description: 'Followed' })
    @ApiResponse({ status: 200, description: 'Not followed' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @ApiResponse({ status: 409, description: 'Cannot follow yourself' })
    @Post('follow')
    async setStatus(@Request() req: any, @Body('target_id') target_id: number) {
        const user_id: number = req.user.user_id     
        const status = await this.followService.followTarget(user_id, target_id);
        if (status) return { message: "Followed", statusCode: 200 };
        return { message: "Not followed", statusCode: 200 };
    }

    @ApiOperation({ summary: `Get all target following`, description: `Get target's following list.` })
    @UseGuards(RolesGuard)
    @Roles('admin', 'user')
    @ApiResponse({ status: 200, description: 'Following list of user_id: <user_id> + following list' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @Get('following')
    async getFollowingList(@Query('user_id') user_id: number) {
        const list = await this.followService.followingList(user_id)
        return { message: `Following list of user_id: ${user_id}`, statusCode: 200, list: list }
    }

    @ApiOperation({ summary: `Get all target follower`, description: `Get target's follower list.` })
    @UseGuards(RolesGuard)
    @Roles('admin', 'user')
    @ApiResponse({ status: 200, description: 'Follower list of user_id: <user_id> + follower list' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @Get('follower')
    async getFollowerList(@Query('user_id') user_id: number) {
        const list = await this.followService.followerList(user_id)
        return { message: `Follower list of user_id: ${user_id}`, statusCode: 200, list: list }
    }
}
