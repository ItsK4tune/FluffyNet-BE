import { Body, Controller, BadRequestException, Post, UseGuards, Get, Req, Query } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthenService } from './authen.service';
import { AuthenDTO } from './dtos/authen.dto';
import { GoogleAuthGuard } from '../../guards/google.guard';

@ApiTags('Authentication')
@Controller('authen')
export class AuthenController {
    constructor (
        private readonly authenService: AuthenService,
    ){}

    @Post('register')
    @ApiOperation({ summary: 'User register', description: 'Create user for further using.' })
    @ApiBody({
        schema: {
            type: 'object', 
            properties: {
                username: { type: 'string', example: 'username' }, 
                password: { type: 'string', example: 'password' },
            },
            required: ['username', 'password'], 
        },
    })
    async register(@Body() authenDTO: AuthenDTO) {
        return await this.authenService.createUser(authenDTO);
    }

    @Post('login')
    @ApiOperation({ summary: 'User login', description: 'Authenticate user and return JWT token.' })
    @ApiBody({
        schema: {
            type: 'object', 
            properties: {
                username: { type: 'string', example: 'username' }, 
                password: { type: 'string', example: 'password' },
            },
            required: ['username', 'password'], 
        },
    })
    async login(@Body() authenDTO: AuthenDTO) {
        const user = await this.authenService.validateUser(authenDTO);
        if (!user) throw new BadRequestException('Wrong username or password');
        return { message: "Login successfully", token: user };
    }

    @Get('google')
    @ApiOperation({ summary: 'User login via Google Oauth', description: 'Authenticate user and return JWT token.' })
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {}

    @Get('google/callback')
    @ApiOperation({ summary: 'Callback url for Google Oauth' })
    @UseGuards(GoogleAuthGuard)
    async googleAuthRedirect(@Req() req) {
        return req.user;
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'User forgot password', description: 'Send a password reset email.' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
            email: { type: 'string', example: 'user@example.com' },
            },
            required: ['email'],
        },
    })
    async forgotPassword(@Body('email') email: string) {
        return await this.authenService.forgotPassword(email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'User reset password', description: 'Reset password using a token.' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                newPassword: { type: 'string', example: 'newStrongPassword123!' },
            },
            required: ['newPassword'],
        },
    })
    async resetPassword(@Query('token') token: string, @Body('newPassword') newPassword: string) {
        return await this.authenService.resetPassword(token, newPassword);
    }
}
