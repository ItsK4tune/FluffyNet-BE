import { Controller, Get, Put, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { ProfileService } from './profile.service';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileDto } from './dtos/edit-profile.dto';

@Controller('Profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @ApiOperation({ summary: `Get user's profile`, description: `Authenticate user, check authorize and return user's profile.` })
    @Get('view-profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth() 
    async viewProfile(@Request() req) {
        const user: number = req.user_id;
        const profile = await this.profileService.getProfile(user);

        if (!profile)   throw new BadRequestException({ message: 'User not found'});
        return { message: `Fetch successfully from ${(req.user.username === null) ? req.user.email : req.user.username}`, profile: profile };
    }

    @ApiOperation({ summary: `Edit user's profile`, description: `Authenticate user, check authorize (only user can edit their's profile).` })
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
    @Put('edit-profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth() 
    async editProfile(@Request() req, @Body() body: ProfileDto) {
        const user: number = req.user_id
        return await this.profileService.editProfile(user, body);
    }
}