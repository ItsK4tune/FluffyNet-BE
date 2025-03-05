import { Body, Controller, BadRequestException, Post, UseGuards, Get, Req } from '@nestjs/common';
import { ApiBody, ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthenService } from './authen.service';
import { AuthenDTO } from './dto/authen.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guard/jwt.guard';
import { GoogleAuthGuard } from './guard/google.guard';

@ApiTags('authen')
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
        return user;
    }

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {}

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthRedirect(@Req() req) {
        return req.user;
    }
}
