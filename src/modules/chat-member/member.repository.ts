import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { createQueryBuilder, Repository } from 'typeorm';
import { Member } from './entities/member.entity';
import { Profile } from '../profile/entities/profile.entity';

@Injectable()
export class MemberRepository {
  private readonly logger = new Logger(MemberRepository.name);
  constructor(
    @InjectRepository(Member)
    private readonly repo: Repository<Member>,
  ) {}

  async save(member: Member) {
    return this.repo.save(member);
  }

  async getMemberByRoomIdAndUserId(room_id: number, user_id: number) {
    return this.repo.findOne({ where: { room_id, user_id } });
  }

  async getMemberById(member_id: number) {
    this.logger.log(member_id);
    return this.repo.findOne({ where: { member_id } });
  }

  async getMemberByIdwProfile(member_id: number) {
    return this.repo
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.member_id = :member_id', { member_id })
      .getOne();
  }
}
