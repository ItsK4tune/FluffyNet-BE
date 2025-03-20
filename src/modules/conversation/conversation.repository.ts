import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { In, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { UpdateConversationDto } from './dtos/conversation.dtos';

@Injectable()
export class ConversationRepository {
  constructor(
    @InjectRepository(Conversation)
    private readonly repo: Repository<Conversation>,
  ) {}

  save(conversation: Conversation) {
    return this.repo.save(conversation);
  }

  async findById(id: number) {
    return await this.repo.findOne({ where: { id }, relations: ['members'] });
  }

  async delete(id: number) {
    return await this.repo.delete(id);
  }

  async findByIds(conversationIds: number[]) {
    return this.repo.findBy({ id: In(conversationIds) });
  }

  async update(id: number, updateConversationDto: UpdateConversationDto) {
    return this.repo.update(id, updateConversationDto);
  }

  async getDirectConversation(userId1: number, userId2: number) {
    return this.repo
      .createQueryBuilder('conversation')
      .where('conversation.type = :type', { type: 'direct' })
      .leftJoin('conversation.members', 'members')
      .andWhere('members.userUserId IN (:ids)', { ids: [userId1, userId2] })
      .groupBy('conversation.id')
      .having('COUNT(DISTINCT members.userUserId) = 2')
      .getOne();
  }
}
