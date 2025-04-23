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
  ParseIntPipe,
  Param,
  InternalServerErrorException,
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
import { ProfileUploadPresignDto } from './dtos/profile.upload.dto';
import { MinioClientService } from '../minio-client/minio-client.service';
import { convertToSeconds } from 'src/utils/helpers/convert-time.helper';
import { env } from 'src/config';

@ApiTags('Profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly minioClientService: MinioClientService,
  ) {}

  @ApiOperation({
    summary: `Get user's profile`,
    description: `Return user's profile.`,
  })
  @ApiResponse({ status: 200, description: 'profile' }) 
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 404, description: 'Cache error' })
  @Get(':user_id')
  async viewProfile(@Param('user_id', ParseIntPipe) user_id: number) {
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
  @Post('update-background') 
  async setBackground(
    @Query('target_id', ParseIntPipe) target_id: number,
    @Request() req,
    @Body('objectName') objectName: string | null 
  )  {
    const user_id = req.user.user_id;
    const role = req.user.role;
    console.log(role, user_id);
    if (typeof objectName === 'undefined') { 
      throw new BadRequestException('Missing objectName in request body.');
    }
    try {
      const updatedProfile = await this.profileService.updateBackground(user_id, target_id, role, objectName);
      const message = objectName ? 'Background updated successfully.' : 'Background removed successfully.';
      return { message, profile: updatedProfile };
    } catch (error) {
      throw error; 
    }
  }

  @ApiOperation({ summary: 'Get presigned URL for uploading avatar or background' })
  @ApiResponse({ status: 201, description: 'Presigned URL generated.', schema: { properties: { presignedUrl: { type: 'string' }, objectName: { type: 'string' } } } })
  @ApiResponse({ status: 400, description: 'Invalid input (e.g., invalid mime type or imageType).'})
  @Post('generate-upload-url')
  async getPresignedUploadUrl(
    @Request() req,
    @Body() uploadPresignDto: ProfileUploadPresignDto
  ): Promise<{ presignedUrl: string; objectName: string }> {
    const { filename, contentType, imageType } = uploadPresignDto;
    const userId = req.user.user_id;

    const prefix = `profiles/user_${userId}/${imageType}s/`; 

    try {
      const result = await this.minioClientService.generatePresignedUploadUrl(
        filename,
        contentType,
        prefix,
        convertToSeconds(env.minio.time)
      );
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error("Error generating profile upload URL:", error);
      throw new InternalServerErrorException('Could not generate profile image upload URL.');
    }
  }
}
