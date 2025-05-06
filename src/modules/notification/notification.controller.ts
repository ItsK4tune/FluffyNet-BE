import { Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
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
    async getUserNotifications(
        @Req() req,
        @Query('unreadOnly') unreadOnly?: string,
    ) {
        const user_id = req.user.user_id;
        if (unreadOnly === 'true') {
            return await this.notificationService.getUnreadNotifications(user_id);
        } 
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

    @Put(':id/open')
    @ApiOperation({ summary: 'Mark a notification as opened' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
    async markAsOpened(@Param('id') id: string) {
        try {
            const updatedNotification = await this.notificationService.markAsOpened(id);
            return {
                message: 'Notification marked as opened.',
                data: updatedNotification,
            };
        } catch (error) {
            throw error;
        }
    }

    @Put('mark-all-open')
    @ApiOperation({ summary: 'Mark all notifications as opened' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'user')
    @ApiBearerAuth()
    async markAllAsOpened(@Req() req) {
        try {
            const user_id = req.user.user_id;
            const result = await this.notificationService.markAllAsOpened(user_id);
            return {
                message: 'All unread notifications marked as opened.',
                modifiedCount: result.modifiedCount,
            };
        } catch (error) {
            throw error;
        }
    }
}
