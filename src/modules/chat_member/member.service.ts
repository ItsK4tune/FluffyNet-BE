import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberRepository } from './member.repository';
import { AddMemberDto, MemberUpdateDto } from './dtos/member.dtos';
import { Member } from './entities/member.entity';
import { RedisCacheService } from '../redis-cache/redis-cache.service';
import { RedisEnum } from '../../utils/enums/enum';
import { convertToSeconds } from '../../utils/helpers/convert-time.helper';
import { env } from '../../config';

@Injectable()
export class MemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  // add member method
  async addMember(
    addMemberDto: AddMemberDto,
    conversation_id: number,
    userRequestId: number,
  ) {
    if (!(await this.isActiveMember(conversation_id, userRequestId))) {
      throw new UnauthorizedException('Not authorized to add member');
    }

    // Check if member already exists
    let member = await this.getMemberByConversationIdAndUserId(
      conversation_id,
      addMemberDto.user_id,
    );
    if (member) {
      if (member.type === 'blocked') {
        throw new UnauthorizedException('This user blocked this conversation');
      }
      member.type = 'active';
      member = await this.memberRepository.save(member);

      await this.redisSet(member);

      return member;
    }

    member = Object.assign(new Member(), {
      ...addMemberDto,
      conversation_id,
      createdAt: new Date(),
    });
    member = await this.memberRepository.save(member);

    await this.redisSet(member);

    return member;
  }

  // update method
  async updateMember(
    id: number,
    memberUpdateDto: MemberUpdateDto,
    userRequestId: number,
  ) {
    let member = await this.getMemberById(id);
    if (!member || member.type !== 'active') {
      throw new NotFoundException('Member not found');
    }

    // Assign new values
    if (memberUpdateDto.nickname) member.nickname = memberUpdateDto.nickname;
    if (memberUpdateDto.role) {
      if (!(await this.isAdmin(member.conversation_id, userRequestId))) {
        throw new UnauthorizedException('Only admin can update role');
      }
      member.role = memberUpdateDto.role;
    }

    member = await this.memberRepository.save(member);

    await this.redisSet(member);

    return member;
  }

  // update type
  async removeMember(id: number, userRequestId: number) {
    let member = await this.getMemberById(id);

    if (!member || member.type !== 'active') {
      throw new NotFoundException('Member not found');
    }
    if (member.role === 'admin') {
      throw new UnauthorizedException('Admin cannot be removed');
    }
    if (!(await this.isAdmin(member.conversation_id, userRequestId))) {
      throw new UnauthorizedException('Only admin can remove member');
    }

    member.type = 'removed';

    member = await this.memberRepository.save(member);

    await this.redisSet(member);

    return member;
  }

  async leaveConversation(conversationId: number, userRequestId: number) {
    let member = await this.getMemberByConversationIdAndUserId(
      conversationId,
      userRequestId,
    );
    if (!member || member.type !== 'active') {
      throw new NotFoundException('Member not found');
    }
    if (member.role === 'admin') {
      throw new UnauthorizedException('Admin cannot leave conversation');
    }
    member.type = 'left';

    member = await this.memberRepository.save(member);

    await this.redisSet(member);

    return member;
  }

  async acceptConversation(conversationId: number, userId: number) {
    let member = await this.getMemberByConversationIdAndUserId(
      conversationId,
      userId,
    );
    if (!member || member.type !== 'pending') {
      throw new NotFoundException('Member not found');
    }

    member.type = 'active';

    member = await this.memberRepository.save(member);

    await this.redisSet(member);

    return member;
  }

  // get methods - cache this data
  async getMemberById(memberId: number): Promise<Member> {
    const memberKey = `${RedisEnum.member}:${memberId}`;
    const cachedMember = await this.redisCacheService.hget(
      memberKey,
      memberId.toString(),
    );
    if (cachedMember) {
      return JSON.parse(cachedMember) as Member;
    }

    // Nếu không có trong cache, truy vấn từ database
    const member = await this.memberRepository.getMemberById(memberId);
    if (member) {
      // Lưu vào cache
      await this.redisSet(member);
      return member;
    } else throw new NotFoundException('Member not found');
  }

  async getMemberByConversationIdAndUserId(
    conversationId: number,
    userId: number,
  ): Promise<Member> {
    // Tạo key cho index (mapping)
    const cnUId = `${conversationId} ${userId}`;
    const indexKey = `${RedisEnum.member}withCnUId:${cnUId}`;

    // Kiểm tra xem có mapping từ (conversationId, userId) -> memberId hay không
    const memberId = await this.redisCacheService.hget(indexKey, cnUId);

    if (memberId) {
      // Nếu có memberId, dùng getMemberById để lấy Member
      return await this.getMemberById(parseInt(memberId));
    }

    // Nếu không có trong cache, truy vấn từ database
    const member =
      await this.memberRepository.getMemberByConversationIdAndUserId(
        conversationId,
        userId,
      );

    if (member) {
      // Lưu Member object
      await this.redisSet(member);
      return member;
    } else throw new NotFoundException('Member not found');
  }

  // helper methods
  async isAdmin(conversationId: number, userId: number) {
    const member = await this.getMemberByConversationIdAndUserId(
      conversationId,
      userId,
    );
    if (!member) return false;
    return member.role === 'admin';
  }

  async isActiveMember(conversationId: number, userId: number) {
    const member = await this.getMemberByConversationIdAndUserId(
      conversationId,
      userId,
    );
    if (!member) return false;
    return member.type === 'active';
  }

  async redisSet(member: Member) {
    const key = `${RedisEnum.member}:${member.id}`;
    await this.redisCacheService.hset(key, member.id.toString(), member);
    await this.redisCacheService.expire(key, convertToSeconds(env.redis.ttl));

    const cnUId = `${member.conversation_id} ${member.user_id}`;
    const indexKey = `${RedisEnum.member}withCnUId:${cnUId}`;
    await this.redisCacheService.hset(indexKey, cnUId, member.id);
    await this.redisCacheService.expire(
      indexKey,
      convertToSeconds(env.redis.ttl),
    );
  }
}
