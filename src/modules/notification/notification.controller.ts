import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { Roles } from 'src/decorators/role.decorator';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/guards/jwt.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) {}

    @ApiOperation({ summary: `Get all user's notification`, description: `Authenticate, authorize and return user's notification.` })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
    @Get('')
    async getUserNotifications(@Req() req) {
        const user_id = req.user.user_id;
        return await this.notificationService.getUserNotifications(user_id);
    }

    @Get('test')
    async test() {
        await this.notificationService.createNotification(0, 'test', 'This is a test record!');
        return { message: 'success'};
    }

    @Get('test/:user_id')
    async testGet(@Query('user_id') user_id: number) {
        return await this.notificationService.getUserNotifications(user_id);
    }
}
