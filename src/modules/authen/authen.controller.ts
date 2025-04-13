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
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AdminAuthenService, AuthenService, SuperAdminAuthenService } from './authen.service';
import { AuthenDTO } from './dtos/authen.dto';
import { GoogleAuthGuard } from '../../guards/google.guard';
import { Roles } from 'src/decorators/role.decorator';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { env } from 'src/config';
import { RefreshJwtAuthGuard } from 'src/guards/refresh-jwt.guard';
import { ProfileUtil } from '../profile/profile.util';

const REFRESH_COOKIE_NAME = 'jid'; 
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true, 
    path: '/', 
    sameSite: 'strict' as const, 
    domain: '.fluffynet.site' 
};

@ApiTags('Authentication')
@Controller('auth')
export class AuthenController {
    constructor(
        private readonly authenService: AuthenService,
        // private readonly profileUtil: ProfileUtil,
    ) {}

    // For User
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
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 400, description: 'Only username allowed' })
    @ApiResponse({ status: 409, description: 'Username already exists' })
    @Post('register')
    async register(@Body() authenDTO: AuthenDTO) {
        if (authenDTO.email) {
            throw new BadRequestException('Only username allowed');
        }
        const status = await this.authenService.createUser(authenDTO);
        if (status) throw new ConflictException('Username already exists');
        return;
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
    @ApiResponse({ status: 201, description: `User's token` })
    @ApiResponse({ status: 400, description: 'Wrong username/email or password' })
    @Post('login')
    async login(@Body() authenDTO: AuthenDTO, @Res({ passthrough: true }) res) {
        const tokens = await this.authenService.login(authenDTO);
        if (!tokens) throw new BadRequestException('Wrong username/email or password');
        res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
        return { accessToken: tokens.accessToken };
    }

    @ApiOperation({ summary: 'Refresh access token', description: 'Provides a new access token using a valid refresh token from cookie.' })
    @ApiResponse({ status: 200, description: 'New access token generated.' })
    @ApiResponse({ status: 401, description: 'Refresh token is invalid or expired.' })
    @UseGuards(RefreshJwtAuthGuard) 
    @ApiCookieAuth() 
    @Get('refresh') 
    async refreshToken(@Req() req, @Res({ passthrough: true }) res) {
        const user_id = req.user.user_id;
        const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

        if (!refreshToken) {
            this.authenService.revokeAllUserTokens(user_id);
            throw new UnauthorizedException('Refresh token cookie not found.');
        }

        try {
            const result = await this.authenService.refreshToken(user_id, refreshToken);

            if (result.newRefreshToken) {
                res.cookie(REFRESH_COOKIE_NAME, result.newRefreshToken, REFRESH_COOKIE_OPTIONS);
            }

            return { accessToken: result.accessToken }; 
        } catch (error) {
            res.clearCookie(REFRESH_COOKIE_NAME, {
                httpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
                secure: REFRESH_COOKIE_OPTIONS.secure,
                path: REFRESH_COOKIE_OPTIONS.path,
                sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
                domain: REFRESH_COOKIE_OPTIONS.domain 
            });
            if (error instanceof UnauthorizedException) {
                throw error;
            } else {
                throw new UnauthorizedException('Could not refresh token due to server error.');
            }
        }
    }

    @ApiOperation({ summary: 'Check current authentication status', description: 'Returns minimal user info if the JWT cookie is valid and received.' })
    @ApiResponse({ status: 200, description: 'User is currently authenticated.' })
    @ApiResponse({ status: 401, description: 'User is not authenticated (no valid cookie).' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth() 
    @Get('status')       
    async checkStatus(@Request() req) {
        // const profile = await profile
        return {
            isAuthenticated: true,
            user: { 
                user_id: req.user.user_id, 
                role: req.user.roles 
            }  
        };
    }

    @ApiOperation({ summary: 'User logout', description: 'Withdraw JWT token and logout' })
    @ApiResponse({ status: 204 })
    @ApiResponse({ status: 500, description: 'An unexpected error occurred during logout' })
    @UseGuards(RefreshJwtAuthGuard)
    @ApiCookieAuth()
    @Get('logout')
    async logout(@Request() req, @Res({ passthrough: true }) res) {
        const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
        const user_id = req.user?.user_id;

        if (user_id) { 
            await this.authenService.logout(user_id, refreshToken);
        } 

        res.clearCookie(REFRESH_COOKIE_NAME, {
            httpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
            secure: REFRESH_COOKIE_OPTIONS.secure,
            path: REFRESH_COOKIE_OPTIONS.path,
            sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
            domain: REFRESH_COOKIE_OPTIONS.domain 
        });
        return;
    }

    @ApiOperation({
        summary: 'User login via Google Oauth',
        description: 'Authenticate user and return JWT token.',
    })
    @UseGuards(GoogleAuthGuard)
    @Get('google')
    async googleAuth() {}

    @ApiOperation({ summary: 'Callback url for Google Oauth' })
    @ApiResponse({ status: 201 })
    @UseGuards(GoogleAuthGuard)
    @Get('google/callback')
    async googleAuthRedirect(@Req() req, @Res() res) {
        const accessToken = req.user?.accessToken;
        const refreshToken = req.user?.refreshToken;

        if (!accessToken || !refreshToken)  return;

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
        
        const feRedirectUrl = new URL(`${env.fe}/callback`);
        feRedirectUrl.searchParams.append('accessToken', accessToken);

        return res.redirect(feRedirectUrl.toString());
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
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 409, description: 'Account not exist' })
    @Post('forgot-password')
    async forgotPassword(@Body('email') email: string) {
        const status = await this.authenService.forgotPassword(email);
        if (!status) throw new BadRequestException('Account not exist');
        return;
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
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 400, description: 'Wrong token' })
    @ApiResponse({ status: 409, description: 'Token invalid/expired' })
    @Post('reset-password')
    async resetPassword(@Query('token') token: string, @Body('newPassword') newPassword: string) {
        const status = await this.authenService.resetPassword(token, newPassword);
        if (status === null) throw new BadRequestException('Wrong token');
        if (status === false) throw new ConflictException('Token invalid/expired');
        return;
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
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 400, description: 'Account not exist' })
    @ApiResponse({ status: 400, description: 'No email binded to this profile' })
    @ApiResponse({ status: 409, description: 'Email has been verified' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Post('verify-email')
    async verifyEmail(@Request() req, @Body('email') email: string){
        const user_id = req.user.user_id;
        const status = await this.authenService.verifyEmail(user_id, email);
        if (status === null) throw new BadRequestException('Account not exist');
        if (status === false) throw new ConflictException('Email has been verified');
        return;
    }

    @ApiOperation({ summary: 'User verify email', description: 'Verify email using a token.' })
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 400, description: 'Email already binded for other account' })
    @ApiResponse({ status: 409, description: 'Token invalid/expired' })
    @Get('verify')
    async acceptVerifyEmail(@Query('token') token: string){
        const status = await this.authenService.verify(token);
        if (status === null) throw new BadRequestException('Token invalid/expired');
        if (status === false) throw new ConflictException('Email already binded for other account');
        return;
    }

    @ApiOperation({ summary: 'User unbind email', description: 'Unbind email.' })
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiResponse({ status: 201 })
    @ApiResponse({ status: 409, description: 'Token invalid/expired' })
    @Post('unbind')
    async unbindEmail(@Request() req){
        const user_id = req.user.user_id;
        const status = await this.authenService.unbind(user_id);
        if (status === null)    throw new BadRequestException('User not found');
        if (status === false)    throw new ConflictException(`User don't have email binded`);
        return;
    }
    
}

@ApiTags('Authentication - Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
@ApiBearerAuth()
@Controller('admin-auth')
export class AdminController {
    constructor(
        private readonly adminService: AdminAuthenService,
    ) {}

    // For Admin and Super Admin
    @ApiOperation({ summary: 'Admin get user info', description: 'Get user info by username or email.' })
    @Post('get-user')
    async getUser(@Body() authenDTO: AuthenDTO) {
        const user = await this.adminService.getUser(authenDTO);
        if (!user) throw new BadRequestException('User not found');
        return user;
    }

    @ApiOperation({ summary: 'Admin ban user', description: 'Ban user by username or email.' })
    @Post('ban')
    async banUser(@Req() req, @Body() body: { user_id: number; reason: string }) {
        const { user_id, reason } = body;
        const status = await this.adminService.banUser(user_id, req.user.role, reason);
        if (status === null) throw new BadRequestException('User not found');
        if (status === false) throw new ConflictException('User already banned');
        return;
    }

    @ApiOperation({ summary: 'Admin unban user', description: 'Unban user by username or email.' })
    @Post('unban')
    async unbanUser(@Req() req, @Body('user_id') user_id: number) {
        const status = await this.adminService.unbanUser(user_id, req.user.role);
        if (status === null) throw new BadRequestException('User not found');
        if (status === false) throw new ConflictException('User already unbanned');
        return;
    }

    @ApiOperation({ summary: 'Admin suspend user', description: 'Suspend user by user ID.' })
    @Post('suspend')
    async suspendUser(@Req() req, @Body('user_id') body: { user_id: number, duration: string, reason: string }) {
        const { user_id, duration, reason } = body
        const status = await this.adminService.suspendUser(user_id, req.user.role, duration, reason);
        if (status === null) throw new BadRequestException('User not found');
        if (status === false) throw new ConflictException('User already suspended');
        return;
    }

    @ApiOperation({ summary: 'Admin unsuspend user', description: 'Unsuspend user by user ID.' })
    @Post('unsuspend')
    async unsuspendUser(@Req() req, @Body('user_id') user_id: number) {
        const status = await this.adminService.unsuspendUser(user_id, req.user.role);
        if (status === null) throw new BadRequestException('User not found');
        if (status === false) throw new ConflictException('User is not suspended');
        return;
    }

    @ApiOperation({ summary: 'Admin verify user', description: 'Verify user by username or email.' })
    @Post('verify')
    async verifyUser(@Req() req, @Body('user_id') user_id: number) {
        const status = await this.adminService.verifyUser(user_id, req.user.role);
        if (status === null) throw new BadRequestException('User not found');
        if (status === false) throw new ConflictException('User already verified');
        return;
    }

    @ApiOperation({ summary: 'Admin delete user', description: 'Delete user by username or email.' })    
    @Post('delete')
    async deleteUser(@Req() req, @Body('user_id') user_id: number) {
        const status = await this.adminService.deleteUser(user_id, req.user.role);
        if (status === null) throw new BadRequestException('User not found');
        return;
    }
}

@ApiTags('Authentication - Super Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
@ApiBearerAuth()
@Controller('superadmin-auth')
export class SuperAdminController {
    constructor(
        private readonly superAdminService: SuperAdminAuthenService,
    ) {}

    // For Super Admin only
    @ApiOperation({ summary: 'Super Admin create new admin', description: 'Create new admin account.' })
    @Post('create-admin')
    async createAdmin(@Body() authenDTO: AuthenDTO) {
        const status = await this.superAdminService.createAdmin(authenDTO);
        if (status) throw new ConflictException('Username already exists');
        return;
    }

    @ApiOperation({ summary: 'Super Admin change role for account', description: 'Change role for account' })
    @Post('change-role')
    async changeRole(@Req() req, @Body('user_id') user_id: number) {
        const status = await this.superAdminService.changeRole(user_id, req.user.role);
        if (status === null) throw new BadRequestException('User not found');
        return;
    }
}