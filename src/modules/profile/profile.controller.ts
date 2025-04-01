import {
  Controller,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Query,
  Patch,
  NotFoundException,
  UseInterceptors,
  UploadedFiles,
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
  ApiConsumes,
} from '@nestjs/swagger';
import { ProfileDto } from './dtos/profile.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@ApiTags('Profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'user')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({
    summary: `Get user's profile`,
    description: `Return user's profile.`,
  })
  @ApiResponse({
    status: 201,
    description: 'profile',
  })
  @ApiResponse({ status: 400, description: 'User not found' })
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'background', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
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
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  @Patch('edit-profile')
  async editProfile(
    @Request() req,
    @Body() body: ProfileDto,
    @UploadedFiles() files: { avatar?: any; background?: any },
  ) {
    const user: number = req.user.user_id;
    const status = await this.profileService.editProfile(user, body, files);
    if (status == false) return new NotFoundException('User profile not found');
    return;
  }
}
