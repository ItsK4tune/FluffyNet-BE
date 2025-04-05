import {
  Controller,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  Patch,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { ProfileService } from './profile.service';
import {
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { ProfileDto } from './dtos/profile.dto';

@ApiTags('Profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({
    summary: `Get user's profile`,
    description: `Return user's profile.`,
  })
  @ApiResponse({ status: 200, description: 'profile' }) 
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 404, description: 'Cache error' })
  @Get('view-profile')
  async viewProfile(@Query('user_id') user_id: number) {
    const profile = await this.profileService.getProfile(user_id);
    if (!profile) throw new BadRequestException({ message: 'User not found' });
    return {
      profile: profile,
    };
  }

  @ApiOperation({
    summary: `Edit user's profile`,
    description: `Authenticate user, check authorize (only user can edit their's profile).`,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'name' },
        bio: { type: 'string', example: 'this is a bio.' },
        age: { type: 'number', example: 18 },
        gender: { type: 'string', example: 'male' },
        avatar: { type: 'file', format: 'jpeg/png' },
        background: { type: 'file', format: 'jpeg/png' },
        phoneNumber: { type: 'string', example: '0999999999' },
        hobby: { type: 'string', example: 'sport' },
        socialLink: { type: 'string', example: 'social.link.com' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'profile' })
  @ApiResponse({ status: 500, description: 'Failed to update profile data.' })
  @ApiResponse({ status: 404, description: 'Profile not found to edit.' })
  @ApiResponse({ status: 403, description: 'You are not allowed to edit this profile.' })
  @Patch('edit-profile')
  async editProfile(
    @Request() req,
    @Query('target_id') target_id: number,
    @Body() body: ProfileDto,
  ) {
    const user: number = req.user.user_id;
    const role: string = req.user.role;
    const profile = await this.profileService.editProfileData(user, target_id, role, body);
    return { profile: profile };
  }

  @ApiOperation({ summary: `Set user's avatar after successful upload` })
  @ApiBody({ schema: { properties: { objectName: { type: 'string' } }, required: ['objectName'] }})
  @ApiResponse({ status: 200, description: 'Avatar updated.', })
  @ApiResponse({ status: 404, description: 'Profile not found.'})
  @ApiResponse({ status: 400, description: 'Missing objectName.'})
  @Post('update-avatar') 
  async setAvatar(
    @Query('target_id') target_id: number,
    @Request() req,
    @Body('objectName') objectName: string | null 
  )  {
    const user_id = req.user.user_id;
    const role = req.user.role;
    if (typeof objectName === 'undefined') { 
      throw new BadRequestException('Missing objectName in request body.');
    }
    try {
      const updatedProfile = await this.profileService.updateAvatar(user_id, target_id, role, objectName);
      const message = objectName ? 'Avatar updated successfully.' : 'Avatar removed successfully.';
      return { message, profile: updatedProfile };
    } catch (error) {
      throw error; 
    }
  }

  @ApiOperation({ summary: `Set user's background after successful upload` })
  @ApiBody({ schema: { properties: { objectName: { type: 'string' } }, required: ['objectName'] }})
  @ApiResponse({ status: 200, description: 'Background updated.', })
  @ApiResponse({ status: 404, description: 'Profile not found.'})
  @ApiResponse({ status: 400, description: 'Missing objectName.'})
  @Post('update-avatar') 
  async setBackground(
    @Query('target_id') target_id: number,
    @Request() req,
    @Body('objectName') objectName: string | null 
  )  {
    const user_id = req.user.user_id;
    const role = req.user.role;
    if (typeof objectName === 'undefined') { 
      throw new BadRequestException('Missing objectName in request body.');
    }
    try {
      const updatedProfile = await this.profileService.updateAvatar(user_id, target_id, role, objectName);
      const message = objectName ? 'Background updated successfully.' : 'Background removed successfully.';
      return { message, profile: updatedProfile };
    } catch (error) {
      throw error; 
    }
  }
}
