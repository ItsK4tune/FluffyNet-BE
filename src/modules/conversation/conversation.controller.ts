// import {
//   Body,
//   Controller,
//   Delete,
//   Get,
//   Param,
//   Patch,
//   Post,
//   Req,
//   UseGuards,
// } from '@nestjs/common';
// import { ConversationService } from './conversation.service';
// import {
//   ApiBearerAuth,
//   ApiBody,
//   ApiOperation,
//   ApiParam,
//   ApiResponse,
//   ApiTags,
//   getSchemaPath,
// } from '@nestjs/swagger';
// import {
//   CreateConversationDto,
//   UpdateConversationDto,
// } from './dtos/conversation.dtos';
// import { Conversation } from './entities/conversation.entity';
// import { JwtAuthGuard } from '../../guards/jwt.guard';
// import { RolesGuard } from '../../guards/roles.guard';
// import { Roles } from '../../decorators/role.decorator';

// @ApiTags('conversations')
// @Controller('conversations')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin', 'user')
// @ApiBearerAuth()
// export class ConversationController {
//   constructor(private readonly conversationService: ConversationService) {}

//   // -> websockets
//   @Post('create-group')
//   @ApiOperation({ summary: 'Create a new group conversation' })
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         name: {
//           type: 'string',
//           example: 'New conversation',
//         },
//         userIds: {
//           type: 'array',
//           items: {
//             type: 'number',
//           },
//           example: [1, 2, 3],
//         },
//       },
//     },
//   })
//   @ApiResponse({
//     status: 201,
//     description: 'Conversation created successfully',
//     schema: {
//       type: 'object',
//       properties: {
//         statusCode: { type: 'number', example: 201 },
//         message: { type: 'string', example: 'Conversation created' },
//         conversation: {
//           $ref: getSchemaPath(Conversation),
//         },
//       },
//     },
//   })
//   async createConversation(
//     @Body() createConversationDto: CreateConversationDto,
//     @Req() req,
//   ) {
//     const conversation = await this.conversationService.createConversation(
//       createConversationDto,
//       req.user.user_id,
//     );
//     return {
//       statusCode: 201,
//       message: 'Conversation created',
//       conversation,
//     };
//   }

//   // -> websockets
//   @Post('direct/:userId')
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles('admin', 'user')
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Create a direct conversation with another user' })
//   @ApiParam({ name: 'userId', description: 'ID of the user to chat with' })
//   @ApiResponse({ status: 200, description: 'Direct conversation created' })
//   async createDirectConversation(
//     @Param('userId') targetUserId: number,
//     @Req() req,
//   ) {
//     return await this.conversationService.createDirectConversation(
//       req.user.user_id,
//       Number(targetUserId),
//     );
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get conversation by ID' })
//   @ApiParam({ name: 'id', description: 'Conversation ID' })
//   @ApiResponse({
//     status: 200,
//     description: 'Returns the conversation',
//     schema: {
//       type: 'object',
//       properties: {
//         statusCode: { type: 'number', example: 200 },
//         message: {
//           type: 'string',
//           example: 'Conversation retrieved successfully',
//         },
//         conversation: {
//           $ref: getSchemaPath(Conversation),
//         },
//       },
//     },
//   })
//   async getConversationById(@Param('id') id: number, @Req() req) {
//     return {
//       statusCode: 200,
//       message: 'Conversation retrieved successfully',
//       conversation: await this.conversationService.getConversationById(
//         id,
//         req.user.user_id,
//       ),
//     };
//   }

//   @Get('direct/:userId')
//   @ApiOperation({ summary: 'Get direct conversation with another user' })
//   @ApiParam({ name: 'userId', description: 'ID of the user to chat with' })
//   @ApiResponse({
//     status: 200,
//     description: 'Returns the conversation',
//     schema: {
//       type: 'object',
//       properties: {
//         statusCode: { type: 'number', example: 200 },
//         message: {
//           type: 'string',
//           example: 'Conversation retrieved successfully',
//         },
//         conversation: {
//           $ref: getSchemaPath(Conversation),
//         },
//       },
//     },
//   })
//   @ApiResponse({ status: 404, description: 'You and {user} are not connected' })
//   async getDirectConversation(@Param('userId') userId: number, @Req() req) {
//     return {
//       statusCode: 200,
//       message: 'Conversation retrieved successfully',
//       conversation: await this.conversationService.getDirectConversation(
//         req.user.user_id,
//         userId,
//       ),
//     };
//   }

//   @Get('user/:type')
//   @ApiOperation({
//     summary: 'Get all conversations for the current user by type',
//   })
//   @ApiParam({
//     name: 'type',
//     description: 'Conversation type: active or pending',
//   })
//   @ApiResponse({
//     status: 200,
//     description: 'Returns all conversations',
//     schema: {
//       type: 'object',
//       properties: {
//         statusCode: { type: 'number', example: 200 },
//         message: {
//           type: 'string',
//           example: 'Conversations retrieved successfully',
//         },
//         conversations: {
//           type: 'array',
//           items: {
//             $ref: getSchemaPath(Conversation),
//           },
//         },
//       },
//     },
//   })
//   async getUserConversations(@Param('type') type: string, @Req() req) {
//     const conversations =
//       await this.conversationService.getConversationByUserId(
//         req.user.user_id,
//         type,
//       );
//     return {
//       statusCode: 200,
//       message: 'Conversations retrieved successfully',
//       conversations,
//     };
//   }

//   // -> websockets
//   @Patch(':id')
//   @ApiOperation({ summary: 'Update conversation (rename)' })
//   @ApiParam({ name: 'id', description: 'Conversation ID' })
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         name: { type: 'string', example: 'New conversation name' },
//       },
//     },
//   })
//   @ApiResponse({
//     status: 200,
//     description: 'Conversation updated successfully',
//     schema: {
//       type: 'object',
//       properties: {
//         statusCode: { type: 'number', example: 200 },
//         message: {
//           type: 'string',
//           example: 'Conversation updated successfully',
//         },
//         conversation: {
//           $ref: getSchemaPath(Conversation),
//         },
//       },
//     },
//   })
//   async updateConversation(
//     @Param('id') id: number,
//     @Body() updateConversationDto: UpdateConversationDto,
//     @Req() req,
//   ) {
//     await this.conversationService.updateConversation(
//       Number(id),
//       updateConversationDto,
//       req.user.user_id,
//     );
//     return {
//       statusCode: 200,
//       message: 'Conversation updated successfully',
//       conversation: await this.conversationService.getConversationById(
//         id,
//         req.user.user_id,
//       ),
//     };
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a conversation (admin only)' })
//   @ApiParam({ name: 'id', description: 'Conversation ID' })
//   @ApiResponse({
//     status: 200,
//     description: 'Conversation deleted successfully',
//   })
//   async deleteConversation(@Param('id') id: number, @Req() req) {
//     await this.conversationService.deleteConversation(
//       Number(id),
//       req.user.user_id,
//     );
//     return {
//       statusCode: 200,
//       message: 'Conversation deleted successfully',
//     };
//   }
// }
