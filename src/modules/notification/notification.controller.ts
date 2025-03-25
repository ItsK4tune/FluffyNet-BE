// import { Controller, Get, Param, Req } from '@nestjs/common';
// import { NotificationService } from './notification.service';
// import {
//   ApiOperation,
//   ApiParam,
//   ApiResponse,
//   getSchemaPath,
// } from '@nestjs/swagger';
// import { Notify } from './entities/notification.entity';
//
// @Controller('notifications')
// export class NotificationController {
//   constructor(private readonly notifyService: NotificationService) {}
//
//   @ApiOperation({ summary: 'Get notifications' })
//   @ApiResponse({
//     status: 200,
//     description: 'The notifications have been successfully obtained.',
//     schema: {
//       type: 'array',
//       items: {
//         $ref: getSchemaPath(Notify),
//       },
//     },
//   })
//   @ApiParam({ name: 'lastNotificationId', required: false })
//   @Get(':{lastNotificationId}')
//   async getNotifications(
//     @Param('lastNotificationId') lastNotificationId: number,
//     @Req() req,
//   ) {
//     return await this.notifyService.getNotifications(
//       lastNotificationId,
//       req.user.user_id,
//     );
//   }
//
//   // mark all notifications as read
//   @ApiOperation({ summary: 'Mark all notifications as read' })
//   @ApiResponse({
//     status: 200,
//     description: 'All notifications have been marked as read.',
//   })
//   @Get('mark-all-as-read')
//   async markAllAsRead(@Req() req) {
//     return await this.notifyService.markAllAsRead(req.user.user_id);
//   }
// }
