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

    @ApiOperation({ summary: `Get user's profile`, description: `Return user's profile.` })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
    @ApiResponse({ status: 201, description: 'Fetch successfully from user_id: <user_id> + profile' })
    @ApiResponse({ status: 400, description: 'User not found' })
    @Get('view-profile')
    async viewProfile(@Query('user_id') user_id: number) {     
        const profile = await this.profileService.getProfile(user_id);
        if (!profile)   throw new BadRequestException({ message: 'User not found'});
        return { message: `Fetch successfully from user_id: ${user_id}`, profile: profile };
    }

    @ApiOperation({ summary: `Edit user's profile`, description: `Authenticate user, check authorize (only user can edit their's profile).` })
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
    @ApiResponse({ status: 201, description: 'Profile updated successfully + profile' })
    @ApiResponse({ status: 404, description: 'User profile not found' })
    @ApiResponse({ status: 409, description: 'User is not the owner' })
    @Patch('edit-profile')
    async editProfile(@Request() req, @Body() body: ProfileDto, target_id: number) {
        const user: number = req.user.user_id
        const status = await this.profileService.editProfile(user, body, target_id);

        if (status == null) return new BadRequestException('User is not the owner');
        if (status == false)  return new NotFoundException('User profile not found');

        return { message: 'Profile updated successfully + profile' }
    }
}
