import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { ProfileService } from './profile.service';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import {
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { ProfileDto } from './dtos/edit-profile.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({
    summary: `Get user's profile`,
    description: `Return user's profile.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Fetch successfully from user_id: <user_id> + profile',
  })
  @ApiResponse({ status: 400, description: 'User not found' })
  @Get('view-profile')
  async viewProfile(@Query('user_id') user_id: number) {
    const profile = await this.profileService.getProfile(user_id);
    if (!profile) throw new BadRequestException({ message: 'User not found' });
    return {
      message: `Fetch successfully from user_id: ${user_id}`,
      statusCode: 200,
      profile: profile,
    };
  }

  @ApiOperation({
    summary: `Edit user's profile`,
    description: `Authenticate user, check authorize (only user can edit their's profile).`,
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'user')
  @ApiBearerAuth()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'name' },
        bio: { type: 'string', example: 'this is a bio.' },
        age: { type: 'number', example: 18 },
        gender: { type: 'string', example: 'male' },
        avatar: { type: 'string', example: 'url.image.com' },
        background: { type: 'string', example: 'url.image.com' },
        email: { type: 'string', example: 'user@example.com' },
        phoneNumber: { type: 'string', example: '0999999999' },
        hobby: { type: 'string', example: 'sport' },
        socialLink: { type: 'string', example: 'social.link.com' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully + profile',
  })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  @Put('edit-profile')
  async editProfile(@Request() req, @Body() body: ProfileDto) {
    const user: number = req.user.user_id;
    return await this.profileService.editProfile(user, body);
  }
}
