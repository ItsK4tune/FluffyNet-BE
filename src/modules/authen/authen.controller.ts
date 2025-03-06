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
    @Post('register')
    async register(@Body() authenDTO: AuthenDTO) {
        return await this.authenService.createUser(authenDTO);
    }

    @ApiOperation({ summary: 'User login', description: 'Authenticate user and return JWT token.' })
    @ApiBody({
        schema: {
            type: 'object', 
            properties: {
                username: { type: 'string', example: 'username' }, 
                email: { type: 'string', example: 'user@example.com' },
                password: { type: 'string', example: 'password' },
            },
            required: ['password'], 
            oneOf: [
                { required: ['username'] },
                { required: ['email'] }
            ],
        },
    })
    @Post('login')
    async login(@Body() authenDTO: AuthenDTO) {
        const user = await this.authenService.validateUser(authenDTO);
        if (!user) throw new BadRequestException('Wrong username/email or password');
        return { message: "Login successfully", token: user };
    }

    @ApiOperation({ summary: 'User login via Google Oauth', description: 'Authenticate user and return JWT token.' })
    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {}

    @ApiOperation({ summary: 'Callback url for Google Oauth' })
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthRedirect(@Req() req) {
        return req.user;
    }

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
    @Post('forgot-password')
    async forgotPassword(@Body('email') email: string) {
        return await this.authenService.forgotPassword(email);
    }

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
    @Post('reset-password')
    async resetPassword(@Query('token') token: string, @Body('newPassword') newPassword: string) {
        return await this.authenService.resetPassword(token, newPassword);
    }
}