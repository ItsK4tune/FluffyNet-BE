import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';

@Injectable()
export class MemberRepository {
  constructor(
    @InjectRepository(Member)
    private readonly repo: Repository<Member>,
  ) {}

  async save(member: Member) {
    return this.repo.save(member);
  }

  async getMemberByConversationIdAndUserId(
    conversation_id: number,
    user_id: number,
  ) {
    return this.repo.findOne({
      where: { conversation_id, user_id },
    });
  }

  async getMemberById(id: number) {
    return this.repo.findOne({ where: { id } });
  }
}
