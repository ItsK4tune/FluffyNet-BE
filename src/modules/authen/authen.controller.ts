import {
  Body,
  Controller,
  BadRequestException,
  Post,
  UseGuards,
  Get,
  Req,
  Request,
  Query,
  ConflictException,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthenService } from './authen.service';
import { AuthenDTO } from './dtos/authen.dto';
import { GoogleAuthGuard } from '../../guards/google.guard';
import { Roles } from 'src/decorators/role.decorator';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { env } from 'src/config';

@ApiTags('Authentication')
@Controller('auth')
export class AuthenController {
  constructor(private readonly authenService: AuthenService) {}

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
    @ApiResponse({ status: 400, description: 'Only username allowed' })
    @ApiResponse({ status: 409, description: 'Username already exists' })
    @Post('register')
    async register(@Body() authenDTO: AuthenDTO) {
        if (authenDTO.email) {
            throw new BadRequestException('Only username allowed');
        }

        const status = await this.authenService.createUser(authenDTO);
        if (status) throw new ConflictException('Username already exists');
        return { message: 'User created successfully'};
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
    @ApiResponse({ status: 400, description: 'Only one allowed: username or email' })
    @Post('login')
    async login(@Body() authenDTO: AuthenDTO) {
        if (authenDTO.username && authenDTO.email) {
            throw new BadRequestException('Only one allowed: username or email.');
        }

        const user = await this.authenService.login(authenDTO);
        if (!user) throw new BadRequestException('Wrong username/email or password');
        return { message: "Login successfully", token: user };
    }

    @ApiOperation({ summary: 'User logout', description: 'Withdraw JWT token and logout' })
    @ApiResponse({ status: 201, description: `Logout successfully` })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('user', 'admin')
    @Get('logout')
    async logout(@Request() req) {
        const jit = req.user.jit; 
        await this.authenService.logout(jit);
        return { message: "Logout successfully" };
    }

    @ApiOperation({
        summary: 'User login via Google Oauth',
        description: 'Authenticate user and return JWT token.',
    })
    @UseGuards(GoogleAuthGuard)
    @Get('google')
    async googleAuth() {}

    @ApiOperation({ summary: 'Callback url for Google Oauth' })
    @UseGuards(GoogleAuthGuard)
    @ApiResponse({ status: 201, description: `jwt token` })
    @Get('google/callback')
    async googleAuthRedirect(@Req() req, @Res() res) {
        const token = req.user.token;
        return res.redirect(`${env.fe}/auth/callback?token=${token}`);
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
        const status = await this.authenService.forgotPassword(email);
        if (!status) throw new BadRequestException('Account not exist');
        return { message: 'Reset link sent' };
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
        const status = await this.authenService.resetPassword(token, newPassword);
        
        if (status === null) throw new BadRequestException('Wrong token');
        if (status === false) throw new ConflictException('Token invalid/expired');

        return { message: 'New password set' };
    }

    @ApiOperation({ summary: 'User verify email', description: 'Check email and send url to verify email.' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
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
    async verifyEmail(@Request() req, @Body('email') email: string){
        const user_id = req.user.user_id;
        const status = await this.authenService.verifyEmail(user_id, email);

        if (status === null) throw new BadRequestException('Account not exist');
        if (status === false) throw new ConflictException('Email has been verified');

        return { message: 'Verify link sent' };
    }

    @ApiOperation({ summary: 'User verify email', description: 'Verify email using a token.' })
    @ApiResponse({ status: 201, description: `Verified` })
    @ApiResponse({ status: 400, description: 'Wrong token' })
    @ApiResponse({ status: 409, description: 'Token invalid/expired' })
    @Get('verify')
    async acceptVerifyEmail(@Query('token') token: string){
        const status = await this.authenService.verify(token);

        if (status === null) throw new BadRequestException('Token invalid/expired');
        if (status === false) throw new ConflictException('Wrong token');

        return { message: 'Verified' };
    }

    @ApiOperation({ summary: 'User unbind email', description: 'Unbind email.' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
    @ApiResponse({ status: 201, description: `Unbinded` })
    @ApiResponse({ status: 409, description: 'Token invalid/expired' })
    @Get('unbind')
    async unbindEmail(@Request() req){
        const user_id = req.user.user_id;
        const status = await this.authenService.unbind(user_id);

        if (status === null)    throw new BadRequestException('User not found');
        if (status === false)    throw new ConflictException(`User don't have email binded`);

        return { message: 'Unbinded' };
    }
}
