// import {
//   Injectable,
//   NotFoundException,
//   UnauthorizedException,
// } from '@nestjs/common';
// import {
//   CreateConversationDto,
//   UpdateConversationDto,
// } from './dtos/conversation.dtos';
// import { ConversationRepository } from './conversation.repository';
// import { MemberService } from '../conversation_member/member.service';
// import { FollowService } from '../follow/follow.service';
// import { Conversation } from './entities/conversation.entity';
// import { Member } from '../conversation_member/entities/member.entity';
// import { ProfileService } from '../profile/profile.service';

// @Injectable()
// export class ConversationService {
//   constructor(
//     private readonly conversationRepository: ConversationRepository,
//     private readonly followService: FollowService,
//     private readonly memberService: MemberService,
//     private readonly profileService: ProfileService,
//   ) {}

//   // Create methods
//   async createConversation(
//     createConversationDto: CreateConversationDto,
//     userId: number,
//   ) {
//     const conversation = Object.assign(new Conversation(), {
//       name: createConversationDto.name,
//       type: 'group',
//       createdAt: new Date(),
//       members: [],
//     });

//     const admin = await this.profileService.getProfile(userId);
//     const adminMember = Object.assign(new Member(), {
//       userUserId: userId,
//       conversationId: conversation.id,
//       type: 'active',
//       role: 'admin',
//       username: admin.name,
//       nickname: admin.name,
//       avatarUrl: admin.avatar,
//       createdAt: new Date(),
//     });

//     conversation.members.push(adminMember);

//     for (const memberId of createConversationDto.userIds) {
//       if (memberId === userId) continue;
//       const user = await this.profileService.getProfile(memberId);
//       const member = Object.assign(new Member(), {
//         userUserId: memberId,
//         conversationId: conversation.id,
//         type: 'active',
//         role: 'member',
//         username: user.name,
//         nickname: user.name,
//         avatarUrl: user.avatar,
//         createdAt: new Date(),
//       });
//       conversation.members.push(member);
//     }

//     return await this.conversationRepository.save(conversation);
//   }

//   async createDirectConversation(userId1: number, userId2: number) {
//     // Check user1 and user2 is following each other
//     const isFollowing =
//       (await this.followService.getStatus(userId1, userId2)) &&
//       (await this.followService.getStatus(userId2, userId1));
//     const memberType = isFollowing ? 'active' : 'pending';
//     const message = isFollowing
//       ? 'Conversation is created'
//       : 'You and {user2} are not connected. The conversation is pending until {user2} accepts your request';

//     // Create conversation
//     const conversation = Object.assign(new Conversation(), {
//       name: 'Direct conversation',
//       type: 'direct',
//       createdAt: new Date(),
//       members: [],
//     });

//     const user1 = await this.profileService.getProfile(userId1);
//     const user2 = await this.profileService.getProfile(userId2);

//     const member1 = Object.assign(new Member(), {
//       userUserId: userId1,
//       conversationId: conversation.id,
//       type: 'active',
//       role: 'member',
//       username: user1.name,
//       nickname: user1.name,
//       avatarUrl: user1.avatar,
//       createdAt: new Date(),
//     });

//     const member2 = Object.assign(new Member(), {
//       userUserId: userId2,
//       conversationId: conversation.id,
//       type: memberType,
//       role: 'member',
//       username: user2.name,
//       nickname: user2.name,
//       avatarUrl: user2.avatar,
//       createdAt: new Date(),
//     });

//     conversation.members.push(member1);
//     conversation.members.push(member2);

//     await this.conversationRepository.save(conversation);
//     return {
//       statusCode: 200,
//       message: message.replace('{user2}', userId2.toString()),
//       conversation: conversation,
//     };
//   }

//   // Rename method - update
//   async updateConversation(
//     id: number,
//     updateConversationDto: UpdateConversationDto,
//     userId: number,
//   ) {
//     if (!(await this.memberService.isActiveMember(id, userId))) {
//       throw new UnauthorizedException(
//         'Only active members can update conversation',
//       );
//     }

//     return await this.conversationRepository.update(id, updateConversationDto);
//   }

//   // Get methods
//   async getDirectConversation(userId1: number, userId2: number) {
//     const conversation =
//       await this.conversationRepository.getDirectConversation(userId1, userId2);

//     if (!conversation)
//       throw new NotFoundException('You and {user2} are not connected');

//     return conversation;
//   }

//   async getConversationById(id: number, userId: number) {
//     if (!(await this.memberService.isActiveMember(id, userId))) {
//       throw new UnauthorizedException(
//         'Only active members can view conversation',
//       );
//     }
//     return await this.conversationRepository.findById(id);
//   }

//   async getConversationByUserId(userId: number, type: string) {
//     const members = await this.memberService.getMembersByUserId(userId, type); // Get all members by user ID, type (active or pending)

//     if (members.length === 0)
//       throw new NotFoundException('No conversation found');

//     // Extract conversation IDs from members
//     const conversationIds = members.map((member) => member.conversationId);

//     // Fetch all conversations in one query
//     return await this.conversationRepository.findByIds(conversationIds);
//   }

//   // Delete methods
//   // For only admin
//   async deleteConversation(id: number, userId: number) {
//     if (!(await this.memberService.isAdmin(id, userId))) {
//       throw new UnauthorizedException('Only admin can delete conversation');
//     }
//     return await this.conversationRepository.delete(id);
//   }
// }
