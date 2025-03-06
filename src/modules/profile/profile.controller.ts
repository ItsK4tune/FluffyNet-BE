import { Controller, Get, Put, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { ViewProfileDto } from './dtos/view-profile.dto';
import { ProfileService } from './profile.service';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EditProfileDto } from './dtos/edit-profile.dto';

@Controller('Profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @ApiOperation({ summary: `Get user's profile`, description: `Authenticate user, check authorize and return user's profile.` })
    @Get('view-profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth() 
    async viewProfile(@Request() req) {
        const data: ViewProfileDto = {
            username: req.user.username,
            email: req.user.email,
        }
        const profile = await this.profileService.getProfile(data);

        if (!profile)   throw new BadRequestException({ message: 'User not found'});
        return { message: `Fetch successfully from ${(req.user.username === null) ? req.user.email : req.user.username}`, profile: profile };
    }

    @ApiOperation({ summary: `Edit user's profile`, description: `Authenticate user, check authorize (only user can edit their's profile).` })
    @ApiBody({
        schema: {
            type: 'object', 
            properties: {
                name: { type: 'string', example: 'name' }, 
                age: { type: 'number', example: 18 }, 
                gender: { type: 'string', example: 'male' }, 
                avatar: { type: 'string', example: 'url.image.com' }, 
                email: { type: 'string', example: 'user@example.com' },
                phonenumber: { type: 'string', example: '0999999999' }, 
                hobby: { type: 'string', example: 'sport' },
                sociallink: { type: 'string', example: 'social.link.com' },  
            },
        },
    })
    @Put('edit-profile')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth() 
    async editProfile(@Request() req, @Body() body: EditProfileDto) {
        const data: ViewProfileDto = {
            username: req.user.username,
            email: req.user.email,
        }
        return await this.profileService.editProfile(data, body);
    }
}