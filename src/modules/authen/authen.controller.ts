import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AuthenService } from './authen.service';

@ApiTags('user')
@Controller('user')
export class AuthenController {
    constructor (
        private readonly authenService: AuthenService,
    ){}

    @Post('register')
    @ApiBody({
        schema: {
            type: 'json',
            properties: {
                username: {
                    type: 'string',
                },
                password: {
                    type: 'string',
                }
            },
        },
    })
    async register(@Body() body: { username: string; password: string }) {
        return await this.authenService.createUser(body.username, body.password);
    }

    @Post('login')
    @ApiBody({
        schema: {
            type: 'json',
            properties: {
                username: {
                    type: 'string',
                },
                password: {
                    type: 'string',
                }
            },
        },
    })
    async login(@Body() body: { username: string; password: string }) {
        return await this.authenService.login(body.username, body.password);
    }
}
