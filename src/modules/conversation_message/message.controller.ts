// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Param,
//   Req,
//   UseGuards,
//   Query,
//   Delete,
// } from '@nestjs/common';
// import { MessageService } from './message.service';
// import { CreateMessageDto, GetMessagesDto } from './dtos/message.dtos';
// import {
//   ApiBearerAuth,
//   ApiBody,
//   ApiExtraModels,
//   ApiOperation,
//   ApiParam,
//   ApiResponse,
//   getSchemaPath,
// } from '@nestjs/swagger';
// import { Message } from './entities/message.entity';
// import { JwtAuthGuard } from '../../guards/jwt.guard';
// import { RolesGuard } from '../../guards/roles.guard';
// import { Roles } from '../../decorators/role.decorator';

// @Controller('messages')
// @ApiExtraModels(Message)
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin', 'user')
// @ApiBearerAuth()
// export class MessageController {
//   constructor(private readonly messageService: MessageService) {}

//   // -> websockets
//   @Post('create')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('admin', 'user')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Create new message' })
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         conversationId: {
//           type: 'number',
//           example: 1,
//         },
//         content: {
//           type: 'string',
//           example: 'Hello',
//         },
//         imageUrl: {
//           type: 'string',
//           example: 'https://example.com/image.jpg',
//         },
//         videoUrl: {
//           type: 'string',
//           example: 'https://example.com/video.mp4',
//         },
//         audioUrl: {
//           type: 'string',
//           example: 'https://example.com/audio.mp3',
//         },
//         fileUrl: {
//           type: 'string',
//           example: 'https://example.com/file.pdf',
//         },
//       },
//     },
//     required: true,
//   })
//   @ApiResponse({
//     status: 201,
//     description: 'Message created successfully',
//     schema: {
//       type: 'object',
//       properties: {
//         statusCode: { type: 'number', example: 201 },
//         description: {
//           type: 'string',
//           example: 'Message created successfully',
//         },
//         data: { type: 'object', $ref: getSchemaPath(Message) },
//       },
//     },
//   })
//   @ApiResponse({
//     status: 404,
//     description: 'Conversation not found',
//   })
//   async createMessage(@Body() createMessageDto: CreateMessageDto, @Req() req) {
//     const message = await this.messageService.create(
//       createMessageDto,
//       req.user.user_id,
//     );
//     return {
//       statusCode: 201,
//       description: 'Message created successfully',
//       data: message,
//     };
//   }

//   // -> websockets
//   @Delete('delete/:id')
//   @ApiOperation({ summary: 'Delete a message' })
//   @ApiParam({ name: 'id', description: 'Message ID' })
//   @ApiResponse({
//     status: 200,
//     description: 'Message deleted successfully',
//   })
//   @ApiResponse({
//     status: 404,
//     description: 'Message not found',
//   })
//   @ApiResponse({
//     status: 401,
//     description: 'You are not allowed to delete this message',
//   })
//   async deleteMessage(@Param('id') id: number, @Req() req) {
//     await this.messageService.deleteMessage(id, req.user.user_id);
//     return {
//       statusCode: 200,
//       description: 'Message deleted successfully',
//     };
//   }

//   @Get('conversation')
//   @ApiOperation({ summary: 'Get all messages in a conversation' })
//   @ApiResponse({
//     status: 200,
//     description: 'Messages retrieved successfully',
//     schema: {
//       type: 'object',
//       properties: {
//         statusCode: { type: 'number', example: 200 },
//         description: {
//           type: 'string',
//           example: 'Messages retrieved successfully',
//         },
//         data: {
//           type: 'array',
//           items: { type: 'object', $ref: getSchemaPath(Message) },
//         },
//       },
//     },
//   })
//   @ApiResponse({
//     status: 401,
//     description: 'You are not an active member of this conversation',
//   })
//   async getMessagesByConversation(@Query() query: GetMessagesDto, @Req() req) {
//     const messages = await this.messageService.getMessages(
//       req.user.user_id,
//       query.conversationId,
//       query.lastMessageCreatedAt,
//       query.limit,
//     );
//     return {
//       statusCode: 200,
//       description: 'Messages retrieved successfully',
//       data: messages,
//     };
//   }
// }
