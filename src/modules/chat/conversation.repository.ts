import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { UpdateConversationDto } from './dtos/conversation.dtos';

@Injectable()
export class ConversationRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly repo: Repository<Conversation>,
  ) {}

  async save(conversation: Conversation) {
    return this.repo.save(conversation);
  }

  async findById(id: number) {
    return await this.repo.findOne({ where: { id } });
  }

  async delete(id: number) {
    return await this.repo.delete(id);
  }

  async update(id: number, updateConversationDto: UpdateConversationDto) {
    return this.repo.update(id, updateConversationDto);
  }

  async getDirectConversation(userId1: number, userId2: number) {
    return this.repo
      .createQueryBuilder('conversation')
      .where('conversation.type = :type', { type: 'direct' })
      .leftJoin('conversation.members', 'members')
      .andWhere('members.user_id IN (:ids)', { ids: [userId1, userId2] })
      .groupBy('conversation.id')
      .having('COUNT(DISTINCT members.user_id) = 2')
      .getOne();
  }

  async findByUserId(userId: number, type: string) {
    return this.repo
      .createQueryBuilder('conversation')
      .leftJoin('conversation.members', 'members')
      .where('members.user_id = :userId', { userId })
      .andWhere('members.type = :type', { type })
      .getMany();
  }
}
