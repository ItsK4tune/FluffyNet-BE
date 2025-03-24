import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CreateConversationDto,
  UpdateConversationDto,
} from './dtos/conversation.dtos';
import { ConversationRepository } from './conversation.repository';
import { FollowService } from '../follow/follow.service';
import { Conversation } from './entities/conversation.entity';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { convertToSeconds } from '../../utils/helpers/convert-time.helper';
import { env } from '../../config';
import { RedisEnum } from '../../utils/enums/enum';
import { MemberService } from '../chat_member/member.service';
import { Member } from '../chat_member/entities/member.entity';

@Injectable()
export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly redisService: RedisCacheService,
    private readonly followService: FollowService,
    private readonly memberService: MemberService,
  ) {}

  // Create methods
  async createConversation(
    createConversationDto: CreateConversationDto,
    userId: number,
  ) {
    let conversation: Conversation = Object.assign(new Conversation(), {
      name: createConversationDto.name,
      type: 'group',
      create_at: new Date(),
      members: [],
    });

    const adminMember = Object.assign(new Member(), {
      user_id: userId,
      conversation_id: conversation.id,
      type: 'active',
      role: 'admin',
      created_at: new Date(),
    });
    conversation.members.push(adminMember);
    for (const memberId of createConversationDto.userIds) {
      if (memberId === userId) continue;
      const member = Object.assign(new Member(), {
        user_id: memberId,
        conversation_id: conversation.id,
        type: 'active',
        role: 'member',
        create_at: new Date(),
      });
      conversation.members.push(member);
    }

    conversation = await this.conversationRepository.save(conversation);

    const key = `RedisEnum.CONVERSATION:${conversation.id}`;
    await this.redisService.hset(key, conversation.id.toString(), conversation);
    await this.redisService.expire(key, convertToSeconds(env.redis.ttl));

    return conversation;
  }

  async createDirectConversation(userId1: number, userId2: number) {
    // Check user1 and user2 is following each other
    const isFollowing =
      (await this.followService.getStatus(userId1, userId2)) &&
      (await this.followService.getStatus(userId2, userId1));
    const memberType = isFollowing ? 'active' : 'pending';
    const message = isFollowing
      ? 'Conversation is created'
      : 'You and {user2} are not connected. The conversation is pending until {user2} accepts your request';

    let conversation: Conversation = Object.assign(new Conversation(), {
      name: 'Direct conversation',
      type: 'direct',
      created_at: new Date(),
      members: [],
    });

    const member1 = Object.assign(new Member(), {
      user_id: userId1,
      conversation_id: conversation.id,
      type: 'active',
      role: 'member',
      created_at: new Date(),
    });
    const member2 = Object.assign(new Member(), {
      user_id: userId2,
      conversation_id: conversation.id,
      type: memberType,
      role: 'member',
      created_at: new Date(),
    });
    conversation.members.push(member1);
    conversation.members.push(member2);

    conversation = await this.conversationRepository.save(conversation);

    const key = `${RedisEnum.conversation}:${conversation.id}`;
    await this.redisService.hset(key, conversation.id.toString(), conversation);
    await this.redisService.expire(key, convertToSeconds(env.redis.ttl));

    return {
      statusCode: 200,
      message: message.replace('{user2}', userId2.toString()),
      conversation: conversation,
    };
  }

  // Rename method - update
  async updateConversation(
    id: number,
    updateConversationDto: UpdateConversationDto,
    userId: number,
  ) {
    // websocket will handle this
    if (!(await this.memberService.isActiveMember(id, userId))) {
      throw new UnauthorizedException(
        'Only active members can update conversation',
      );
    }

    await this.conversationRepository.update(id, updateConversationDto);
    const conversation = await this.conversationRepository.findById(id);

    const key = `${RedisEnum.conversation}:${conversation.id}`;
    await this.redisService.hset(key, conversation.id.toString(), conversation);
    await this.redisService.expire(key, convertToSeconds(env.redis.ttl));

    return conversation;
  }

  // Get methods

  // need cache? - how to handle cache - and should?
  async getDirectConversation(userId1: number, userId2: number) {
    const conversation =
      await this.conversationRepository.getDirectConversation(userId1, userId2);
    if (!conversation)
      throw new NotFoundException('You and {user2} are not connected');
    return conversation;
  }

  async getConversationById(id: number, userId: number) {
    if (!(await this.memberService.isActiveMember(id, userId))) {
      throw new UnauthorizedException(
        'Only active members can view conversation',
      );
    }

    const key = `${RedisEnum.conversation}:${id}`;
    const cache = await this.redisService.get(key);

    if (cache) {
      return JSON.parse(cache) as Conversation;
    }

    const conversation = await this.conversationRepository.findById(id);

    await this.redisService.hset(key, conversation.id.toString(), conversation);
    await this.redisService.expire(key, convertToSeconds(env.redis.ttl));

    return conversation;
  }

  async getConversationByUserId(userId: number, type: string) {
    const key = `${RedisEnum.conversation}:${userId}:${type}`;
    const cachedConversation = await this.redisService.hgetall(key);

    if (cachedConversation && Object.keys(cachedConversation).length > 0) {
      return Object.values(cachedConversation).map((c) => JSON.parse(c));
    } else {
      const conversations = await this.conversationRepository.findByUserId(
        userId,
        type,
      );
      await this.redisService.hsetall(key, conversations);
      await this.redisService.expire(key, convertToSeconds(env.redis.ttl));
      return conversations;
    }
  }

  // Delete methods
  // For only admin
  async deleteConversation(id: number, userId: number) {
    if (!(await this.memberService.isAdmin(id, userId))) {
      throw new UnauthorizedException('Only admin can delete conversation');
    }

    const key = `${RedisEnum.conversation}:${id}`;
    await this.redisService.del(key);

    return await this.conversationRepository.delete(id);
  }
}
