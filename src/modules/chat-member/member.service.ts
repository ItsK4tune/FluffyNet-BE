import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
import { ChatGateway } from '../gateway/chat.gateway';
import { json } from "express";

@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly redisCacheService: RedisCacheService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async addMember(
    addMemberDto: AddMemberDto,
    roomId: number,
    userRequestId: number,
  ) {
    if (!(await this.isActiveMember(roomId, userRequestId)))
      throw new UnauthorizedException('You are not an active member');

    // Check if member already exists
    let member = await this.getMemberByRoomIdAndUserId(
      roomId,
      addMemberDto.user_id,
    );
    if (member) {
      if (member.type === 'blocked')
        throw new UnauthorizedException('This user blocked this room');

      if (member.type === 'active')
        throw new HttpException('Member already exists', 409);

      member.type = 'active';
      member = await this.memberRepository.save(member);
      await this.redisSet(member);

      await this.chatGateway.handleJoinChat(member);
      return member;
    }

    member = Object.assign(new Member(), {
      ...addMemberDto,
      room_id: roomId,
    });
    member = await this.memberRepository.save(member);
    await this.redisSet(member);

    await this.chatGateway.handleJoinChat(member);
    return member;
  }

  async updateMember(
    id: number,
    memberUpdateDto: MemberUpdateDto,
    userRequestId: number,
  ) {
    let member = await this.getMemberById(id);
    if (!member || member.type !== 'active')
      throw new NotFoundException('Member not found');

    if (memberUpdateDto.nickname) member.nickname = memberUpdateDto.nickname;
    if (memberUpdateDto.role) {
      if (!(await this.isAdmin(member.room_id, userRequestId)))
        throw new UnauthorizedException('Only admin can update role');
      member.role = memberUpdateDto.role;
    }

    member = await this.memberRepository.save(member);
    await this.redisSet(member);

    await this.chatGateway.handleUpdateMember(member);
    return member;
  }

  // update type
  async removeMember(id: number, userRequestId: number) {
    let member = await this.getMemberById(id);

    if (!member || member.type !== 'active')
      throw new NotFoundException('Member not found');

    if (member.role === 'admin')
      throw new UnauthorizedException('Admin cannot be removed');

    if (!(await this.isAdmin(member.room_id, userRequestId)))
      throw new ForbiddenException('Only admin can remove member');

    member.type = 'removed';
    member = await this.memberRepository.save(member);
    await this.redisSet(member);

    await this.chatGateway.handleLeaveChat(member);
  }

  async leaveRoom(roomId: number, userRequestId: number) {
    let member = await this.getMemberByRoomIdAndUserId(roomId, userRequestId);
    if (!member || member.type !== 'active')
      throw new NotFoundException('Member not found');

    if (member.role === 'admin')
      throw new UnauthorizedException('Admin cannot leave room');

    member.type = 'left';
    member = await this.memberRepository.save(member);
    await this.redisSet(member);

    await this.chatGateway.handleLeaveChat(member);
  }

  async acceptChat(roomId: number, userId: number) {
    let member = await this.getMemberByRoomIdAndUserId(roomId, userId);
    if (!member || member.type !== 'pending')
      throw new NotFoundException('Member not found');

    member.type = 'active';
    member = await this.memberRepository.save(member);
    await this.redisSet(member);

    await this.chatGateway.handleJoinChat(member);
  }

  // get methods - cache this data
  async getMemberById(memberId: number): Promise<Member> {
    const memberKey = `${RedisEnum.member}:${memberId}`;
    const cachedMember = await this.redisCacheService.hget(
      memberKey,
      memberId.toString(),
    );
    if (cachedMember) return JSON.parse(cachedMember) as Member;

    const member = await this.memberRepository.getMemberById(memberId);
    if (member) {
      await this.redisSet(member);
      return member;
    } else return null;
  }

  async getMemberByRoomIdAndUserId(
    roomId: number,
    userId: number,
  ): Promise<Member> {
    //  (roomId, userId) => memberId => member
    const rnUId = `${roomId} ${userId}`;
    const indexKey = `${RedisEnum.member}withRnUId:${rnUId}`;

    const key = await this.redisCacheService.hget(indexKey, rnUId);
    const value = JSON.parse(key) as number;
    if (value) return await this.getMemberById(Number(value));

    const member = await this.memberRepository.getMemberByRoomIdAndUserId(
      roomId,
      userId,
    );

    if (member) {
      await this.redisSet(member);
      return member;
    } else return null;
  }

  // helper methods
  async isAdmin(roomId: number, userId: number) {
    const member = await this.getMemberByRoomIdAndUserId(roomId, userId);
    return member && member.role === 'admin';
  }

  async isActiveMember(roomId: number, userId: number) {
    const member = await this.getMemberByRoomIdAndUserId(roomId, userId);
    return member && member.type === 'active';
  }

  async redisSet(member: Member) {
    const key = `${RedisEnum.member}:${member.member_id}`;
    await this.redisCacheService.hset(key, member.member_id.toString(), member);
    await this.redisCacheService.expire(key, convertToSeconds(env.redis.ttl));

    const rnUId = `${member.room_id} ${member.user_id}`;
    const rnUKey = `${RedisEnum.member}withRnUId:${rnUId}`;
    await this.redisCacheService.hset(
      rnUKey,
      rnUId,
      member.member_id.toString(),
    );
    await this.redisCacheService.expire(
      rnUKey,
      convertToSeconds(env.redis.ttl),
    );
  }
}
