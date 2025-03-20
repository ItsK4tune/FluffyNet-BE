import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MemberRepository } from './member.repository';
import { AddMemberDto, MemberUpdateDto } from './dtos/member.dtos';
import { Member } from './entities/member.entity';
import { ProfileService } from '../profile/profile.service';

@Injectable()
export class MemberService {
  constructor(
    private readonly memberRepository: MemberRepository,
    private readonly userService: ProfileService,
  ) {}

  async addMember(
    addMemberDto: AddMemberDto,
    conversationId: number,
    userRequestId: number,
  ) {
    // Check if user has permission to add member
    if (this.isActiveMember(conversationId, userRequestId)) {
      throw new UnauthorizedException('Not authorized to add member');
    }

    // Check if member already exists
    const memberExists =
      await this.memberRepository.getMemberByConversationIdAndUserId(
        conversationId,
        addMemberDto.userUserId,
      );
    if (memberExists && memberExists.type === 'blocked') {
      memberExists.type = 'active';
      return this.memberRepository.save(memberExists);
    }

    const user = await this.userService.getProfile(addMemberDto.userUserId);

    const member = Object.assign(new Member(), {
      ...addMemberDto,
      conversationId,
      username: user.name,
      nickname: user.name,
      avatarUrl: user.avatar,
      createdAt: new Date(),
    });

    return this.memberRepository.save(member);
  }

  // update method
  async updateMember(
    id: number,
    memberUpdateDto: MemberUpdateDto,
    userRequestId: number,
  ) {
    const member = await this.memberRepository.getMemberById(id);
    if (!member || member.type !== 'active') {
      throw new NotFoundException('Member not found');
    }
    // Check if updating role to admin requires admin permissions
    if (
      memberUpdateDto.role &&
      !(await this.isAdmin(member.conversationId, userRequestId))
    ) {
      throw new UnauthorizedException('Only admins can assign admin role');
    }

    // Assign new values
    if (memberUpdateDto.nickname) member.nickname = memberUpdateDto.nickname;
    if (memberUpdateDto.role) member.role = memberUpdateDto.role;

    return this.memberRepository.save(member);
  }

  // update type
  async removeMember(id: number, userRequestId: number) {
    const member = await this.memberRepository.getMemberById(id);

    console.log(member);
    if (!member || member.type !== 'active') {
      throw new NotFoundException('Member not found');
    }
    if (member.role === 'admin') {
      throw new UnauthorizedException('Admin cannot be removed');
    }

    if (!this.isAdmin(member.conversationId, userRequestId)) {
      throw new UnauthorizedException('Only admin can remove member');
    }

    member.type = 'removed';

    return this.memberRepository.save(member);
  }

  async leaveConversation(conversationId: number, userRequestId: number) {
    const member = await this.getMemberByConversationIdAndUserId(
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
    return this.memberRepository.save(member);
  }

  async acceptConversation(conversationId: number, userId: number) {
    const member = await this.getMemberByConversationIdAndUserId(
      conversationId,
      userId,
    );
    console.log(member);
    if (!member || member.type !== 'pending') {
      throw new NotFoundException('Member not found');
    }

    member.type = 'active';
    return this.memberRepository.save(member);
  }

  // get methods
  async getMembersByUserId(userId: number, type: string) {
    return this.memberRepository.getMembersByUserId(userId, type);
  }

  async getMembersByConversationId(conversationId: number, type: string) {
    return this.memberRepository.getMembersByConversationID(
      conversationId,
      type,
    );
  }

  async getMemberByConversationIdAndUserId(
    conversationId: number,
    userUserId: number,
  ) {
    return this.memberRepository.getMemberByConversationIdAndUserId(
      conversationId,
      userUserId,
    );
  }

  // helper methods
  async isAdmin(conversationId: number, userId: number) {
    const member =
      await this.memberRepository.getMemberByConversationIdAndUserId(
        conversationId,
        userId,
      );
    if (!member) return false;
    return member.role === 'admin';
  }

  async isActiveMember(conversationId: number, userId: number) {
    const member =
      await this.memberRepository.getMemberByConversationIdAndUserId(
        conversationId,
        userId,
      );
    if (!member) return false;
    return member.type === 'active';
  }
}
