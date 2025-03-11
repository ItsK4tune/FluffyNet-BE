import { Body, Controller, BadRequestException, Post, UseGuards, Get, Req, Query } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthenService } from './authen.service';
import { AuthenDTO } from './dtos/authen.dto';
import { GoogleAuthGuard } from '../../guards/google.guard';

@ApiTags('Authentication')
@Controller('auth')
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
    @ApiResponse({ status: 201, description: 'User created successfully' })
    @ApiResponse({ status: 400, description: 'Username and password are required' })
    @ApiResponse({ status: 409, description: 'Username already exists' })
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
    @ApiResponse({ status: 201, description: `User created successfully + user's jwt token` })
    @ApiResponse({ status: 400, description: 'Wrong username/email or password' })
    @Post('login')
    async login(@Body() authenDTO: AuthenDTO) {
        const user = await this.authenService.validateUser(authenDTO);
        if (!user) throw new BadRequestException('Wrong username/email or password');
        return { message: "Login successfully", token: user };
    }

    @ApiOperation({ summary: 'User login via Google Oauth', description: 'Authenticate user and return JWT token.' })
    @UseGuards(GoogleAuthGuard)
    @Get('google')
    async googleAuth() {}

    @ApiOperation({ summary: 'Callback url for Google Oauth' })
    @UseGuards(GoogleAuthGuard)
    @ApiResponse({ status: 201, description: `jwt token` })
    @Get('google/callback')
    async googleAuthRedirect(@Req() req) {
        return { token: req.user.token };
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
    @ApiResponse({ status: 201, description: `Reset link sent` })
    @ApiResponse({ status: 409, description: 'Account not exist' })
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
    @ApiResponse({ status: 201, description: `New password set` })
    @ApiResponse({ status: 400, description: 'Wrong token' })
    @ApiResponse({ status: 409, description: 'Token invalid/expired' })
    @Post('reset-password')
    async resetPassword(@Query('token') token: string, @Body('newPassword') newPassword: string) {
        return await this.authenService.resetPassword(token, newPassword);
    }

    @ApiOperation({ summary: 'User verify email', description: 'Check email and send url to verify email.' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
            email: { type: 'string', example: 'user@example.com' },
            },
            required: ['email'],
        },
    })
    @ApiResponse({ status: 201, description: `Verify link sent` })
    @ApiResponse({ status: 400, description: 'Account not exist' })
    @ApiResponse({ status: 409, description: 'Email has been verified' })
    @Post('verify-email')
    async verifyEmail(@Body('email') email: string){
        return await this.authenService.verifyEmail(email);
    }

    @ApiOperation({ summary: 'User verify email', description: 'Verify email using a token.' })
    @ApiResponse({ status: 201, description: `Verified` })
    @ApiResponse({ status: 400, description: 'Wrong token' })
    @ApiResponse({ status: 409, description: 'Token invalid/expired' })
    @Get('verify')
    async acceptVerifyEmail(@Query('token') token: string){
        return await this.authenService.verify(token);
    }
}